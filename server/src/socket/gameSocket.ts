import { Socket } from 'socket.io';
import { Chess } from 'chess.js';
import mongoose from 'mongoose';
import { Game, IGame } from '../models/Game';
import { updateElo } from '../services/eloService';
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

function applyGameEnd(
  game: IGame,
  result: 'white' | 'black' | 'draw',
  winnerId: mongoose.Types.ObjectId | null,
  reason: GameOverPayload['reason'],
): void {
  game.status = 'finished';
  game.result = result;
  game.winner = winnerId;
  game.endReason = reason;
  game.finishedAt = new Date();
  game.drawOffer = null;
}

function emitGameOver(game: IGame, payload: GameOverPayload): void {
  getIO()
    .to(`game:${game._id}`)
    .to(`spectate:${game.spectatorToken}`)
    .emit(SocketEvents.GAME_OVER, payload);
}

async function applyEloUpdate(game: IGame): Promise<void> {
  if (game.status !== 'finished' || !game.result || !game.blackPlayer) return;
  try {
    await updateElo(
      String(game.whitePlayer),
      String(game.blackPlayer),
      game.result,
    );
  } catch (err) {
    console.error('Elo update failed for game', String(game._id), err);
  }
}

async function finishGame(
  game: IGame,
  result: 'white' | 'black' | 'draw',
  winnerId: mongoose.Types.ObjectId | null,
  reason: GameOverPayload['reason'],
): Promise<void> {
  applyGameEnd(game, result, winnerId, reason);
  await game.save();
  await applyEloUpdate(game);
  emitGameOver(game, { winner: result, reason });
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

    // End-of-game detection (chess.js order matters: checkmate before generic isDraw).
    // Apply state changes in-memory now; emit MOVE_UPDATE first, GAME_OVER second
    // so clients see the final move animate before the result overlay.
    let endPayload: GameOverPayload | null = null;
    if (chess.isCheckmate()) {
      applyGameEnd(game, color, userIdForColor(game, color), 'checkmate');
      endPayload = { winner: color, reason: 'checkmate' };
    } else if (chess.isStalemate()) {
      applyGameEnd(game, 'draw', null, 'stalemate');
      endPayload = { winner: 'draw', reason: 'stalemate' };
    } else if (chess.isInsufficientMaterial()) {
      applyGameEnd(game, 'draw', null, 'insufficient_material');
      endPayload = { winner: 'draw', reason: 'insufficient_material' };
    } else if (chess.isThreefoldRepetition()) {
      applyGameEnd(game, 'draw', null, 'threefold_repetition');
      endPayload = { winner: 'draw', reason: 'threefold_repetition' };
    } else if (chess.isDraw()) {
      applyGameEnd(game, 'draw', null, 'fifty_move_rule');
      endPayload = { winner: 'draw', reason: 'fifty_move_rule' };
    }

    await game.save();

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

    if (endPayload) {
      await applyEloUpdate(game);
      emitGameOver(game, endPayload);
    }
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

  // Explicit leave (e.g. user navigates from /game/:id to /lobby).
  // Treated as a disconnect: marks `disconnectedSince[color]` and notifies opponent.
  socket.on(SocketEvents.GAME_LEAVE, async (gameId: string) => {
    if (typeof gameId !== 'string') return;
    if (!joinedGames.has(gameId)) return;
    const loaded = await loadForUser(gameId, userId);
    socket.leave(`game:${gameId}`);
    joinedGames.delete(gameId);
    if (!loaded || loaded.game.status !== 'active') return;
    const { game, color } = loaded;
    const now = new Date();
    game.disconnectedSince[color] = now;
    game.markModified('disconnectedSince');
    await game.save();
    const payload: DisconnectPayload = { color, since: now.toISOString() };
    socket.to(`game:${gameId}`).emit(SocketEvents.GAME_DISCONNECT, payload);
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
