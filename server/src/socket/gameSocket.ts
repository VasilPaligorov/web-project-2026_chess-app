import { Socket } from 'socket.io';
import { Chess } from 'chess.js';
import mongoose from 'mongoose';
import { Game, IGame } from '../models/Game';
import { getIO } from './io';
import {
  SocketEvents,
  GameOverPayload,
  MoveErrorPayload,
  MovePayload,
  MoveUpdatePayload,
  DrawOfferPayload,
  DisconnectPayload,
  ReconnectPayload,
} from '../../../shared/types';

type Color = 'white' | 'black';

function colorOf(game: IGame, userId: string): Color | null {
  if (game.whitePlayer.toString() === userId) return 'white';
  if (game.blackPlayer?.toString() === userId) return 'black';
  return null;
}

function opponent(c: Color): Color {
  return c === 'white' ? 'black' : 'white';
}

function userIdForColor(game: IGame, c: Color): mongoose.Types.ObjectId | null {
  return c === 'white'
    ? (game.whitePlayer as mongoose.Types.ObjectId)
    : (game.blackPlayer as mongoose.Types.ObjectId | null);
}

async function loadForUser(
  gameId: string,
  userId: string,
): Promise<{ game: IGame; color: Color } | null> {
  if (!mongoose.Types.ObjectId.isValid(gameId)) return null;
  const game = await Game.findById(gameId);
  if (!game) return null;
  const color = colorOf(game, userId);
  if (!color) return null;
  return { game, color };
}

async function finishGame(
  game: IGame,
  result: 'white' | 'black' | 'draw',
  winnerId: mongoose.Types.ObjectId | null,
  reason: GameOverPayload['reason'],
): Promise<void> {
  game.status = 'finished';
  game.result = result;
  game.winner = winnerId;
  game.finishedAt = new Date();
  game.drawOffer = null;
  await game.save();

  const payload: GameOverPayload = { winner: result, reason };
  getIO()
    .to(`game:${game._id}`)
    .to(`spectate:${game.spectatorToken}`)
    .emit(SocketEvents.GAME_OVER, payload);
}

function loadChess(game: IGame): Chess {
  const chess = new Chess();
  if (game.pgn) {
    try {
      chess.loadPgn(game.pgn);
      return chess;
    } catch {
      /* fall through to FEN */
    }
  }
  if (game.fen) {
    chess.load(game.fen);
  }
  return chess;
}

export function registerGameHandlers(socket: Socket): void {
  const userId = socket.data.userId;
  if (!userId) return; // unauthenticated socket — gameplay events not allowed

  const joinedGames = new Set<string>();

  socket.on(SocketEvents.GAME_JOIN, async (gameId: string) => {
    if (typeof gameId !== 'string') return;
    const loaded = await loadForUser(gameId, userId);
    if (!loaded) return;
    const { game, color } = loaded;

    socket.join(`game:${gameId}`);
    joinedGames.add(gameId);

    // Clear stale disconnect marker if this user is back
    if (game.disconnectedSince[color]) {
      game.disconnectedSince[color] = null;
      game.markModified('disconnectedSince');
      await game.save();
      const payload: ReconnectPayload = { color };
      socket.to(`game:${gameId}`).emit(SocketEvents.GAME_RECONNECT, payload);
    }
  });

  socket.on(SocketEvents.MOVE_MAKE, async (payload: MovePayload) => {
    if (!payload || typeof payload.gameId !== 'string' || !payload.move) return;
    const loaded = await loadForUser(payload.gameId, userId);
    if (!loaded) return;
    const { game, color } = loaded;

    if (game.status !== 'active') {
      socket.emit(SocketEvents.MOVE_ERROR, { message: 'Game is not active' } as MoveErrorPayload);
      return;
    }

    const chess = loadChess(game);
    const expected = color === 'white' ? 'w' : 'b';
    if (chess.turn() !== expected) {
      socket.emit(SocketEvents.MOVE_ERROR, { message: "It's not your turn" } as MoveErrorPayload);
      return;
    }

    let made;
    try {
      made = chess.move({
        from: payload.move.from,
        to: payload.move.to,
        promotion: payload.move.promotion ?? 'q',
      });
    } catch {
      socket.emit(SocketEvents.MOVE_ERROR, { message: 'Illegal move' } as MoveErrorPayload);
      return;
    }
    if (!made) {
      socket.emit(SocketEvents.MOVE_ERROR, { message: 'Illegal move' } as MoveErrorPayload);
      return;
    }

    game.fen = chess.fen();
    game.pgn = chess.pgn();
    game.lastMoveAt = new Date();

    // End-of-game detection (chess.js order matters: checkmate before generic isDraw)
    let ended = false;
    if (chess.isCheckmate()) {
      await finishGame(game, color, userIdForColor(game, color), 'checkmate');
      ended = true;
    } else if (chess.isStalemate()) {
      await finishGame(game, 'draw', null, 'stalemate');
      ended = true;
    } else if (chess.isInsufficientMaterial()) {
      await finishGame(game, 'draw', null, 'insufficient_material');
      ended = true;
    } else if (chess.isThreefoldRepetition()) {
      await finishGame(game, 'draw', null, 'threefold_repetition');
      ended = true;
    } else if (chess.isDraw()) {
      await finishGame(game, 'draw', null, 'fifty_move_rule');
      ended = true;
    }

    if (!ended) {
      await game.save();
    }

    const update: MoveUpdatePayload = {
      fen: game.fen,
      pgn: game.pgn,
      turn: chess.turn(),
      lastMove: {
        from: payload.move.from,
        to: payload.move.to,
        promotion: payload.move.promotion,
      },
    };
    getIO()
      .to(`game:${game._id}`)
      .to(`spectate:${game.spectatorToken}`)
      .emit(SocketEvents.MOVE_UPDATE, update);
  });

  socket.on(SocketEvents.GAME_RESIGN, async (gameId: string) => {
    if (typeof gameId !== 'string') return;
    const loaded = await loadForUser(gameId, userId);
    if (!loaded || loaded.game.status !== 'active') return;
    const { game, color } = loaded;
    const winnerColor = opponent(color);
    await finishGame(game, winnerColor, userIdForColor(game, winnerColor), 'resignation');
  });

  socket.on(SocketEvents.DRAW_OFFER, async (gameId: string) => {
    if (typeof gameId !== 'string') return;
    const loaded = await loadForUser(gameId, userId);
    if (!loaded || loaded.game.status !== 'active') return;
    const { game, color } = loaded;
    if (game.drawOffer) return; // already pending
    game.drawOffer = { from: new mongoose.Types.ObjectId(userId) };
    await game.save();
    const payload: DrawOfferPayload = { from: color };
    socket.to(`game:${gameId}`).emit(SocketEvents.DRAW_OFFER, payload);
  });

  socket.on(SocketEvents.DRAW_ACCEPT, async (gameId: string) => {
    if (typeof gameId !== 'string') return;
    const loaded = await loadForUser(gameId, userId);
    if (!loaded || loaded.game.status !== 'active') return;
    const { game } = loaded;
    if (!game.drawOffer || game.drawOffer.from.toString() === userId) return;
    await finishGame(game, 'draw', null, 'agreement');
  });

  socket.on(SocketEvents.DRAW_DECLINE, async (gameId: string) => {
    if (typeof gameId !== 'string') return;
    const loaded = await loadForUser(gameId, userId);
    if (!loaded || loaded.game.status !== 'active') return;
    const { game } = loaded;
    if (!game.drawOffer || game.drawOffer.from.toString() === userId) return;
    game.drawOffer = null;
    await game.save();
    socket.to(`game:${gameId}`).emit(SocketEvents.DRAW_DECLINED);
  });

  socket.on(SocketEvents.GAME_CLAIM_WIN, async (gameId: string) => {
    if (typeof gameId !== 'string') return;
    const loaded = await loadForUser(gameId, userId);
    if (!loaded || loaded.game.status !== 'active') return;
    const { game, color } = loaded;
    const oppC = opponent(color);
    const oppDisconnectedAt = game.disconnectedSince[oppC];
    if (!oppDisconnectedAt) {
      socket.emit(SocketEvents.GAME_CLAIM_ERROR, {
        message: 'Opponent is not disconnected',
      });
      return;
    }
    const elapsed = Date.now() - oppDisconnectedAt.getTime();
    if (elapsed < 60_000) {
      socket.emit(SocketEvents.GAME_CLAIM_ERROR, {
        message: `Wait ${Math.ceil((60_000 - elapsed) / 1000)}s longer`,
      });
      return;
    }
    await finishGame(game, color, userIdForColor(game, color), 'abandonment');
  });

  socket.on('disconnecting', async () => {
    for (const gameId of joinedGames) {
      try {
        const loaded = await loadForUser(gameId, userId);
        if (!loaded || loaded.game.status !== 'active') continue;
        const { game, color } = loaded;
        const now = new Date();
        game.disconnectedSince[color] = now;
        game.markModified('disconnectedSince');
        await game.save();
        const payload: DisconnectPayload = { color, since: now.toISOString() };
        socket.to(`game:${gameId}`).emit(SocketEvents.GAME_DISCONNECT, payload);
      } catch (err) {
        console.error('Game disconnect handler error:', err);
      }
    }
  });
}
