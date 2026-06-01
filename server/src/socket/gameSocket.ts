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
} from '../../../shared/types';

type Color = 'white' | 'black';

interface GameEnd {
  result: 'white' | 'black' | 'draw';
  reason: GameOverPayload['reason'];
}

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

function detectGameEnd(chess: Chess, moverColor: Color): GameEnd | null {
  if (chess.isCheckmate()) return { result: moverColor, reason: 'checkmate' };
  if (chess.isStalemate()) return { result: 'draw', reason: 'stalemate' };
  if (chess.isInsufficientMaterial()) return { result: 'draw', reason: 'insufficient_material' };
  if (chess.isThreefoldRepetition()) return { result: 'draw', reason: 'threefold_repetition' };
  if (chess.isDraw()) return { result: 'draw', reason: 'fifty_move_rule' };
  return null;
}

function loadChess(game: IGame): Chess {
  const chess = new Chess();
  if (game.pgn) {
    try {
      chess.loadPgn(game.pgn);
      return chess;
    } catch {}
  }
  if (game.fen) {
    chess.load(game.fen);
  }
  return chess;
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

async function loadActiveGameForUser(
  gameId: string,
  userId: string,
): Promise<{ game: IGame; color: Color } | null> {
  const loaded = await loadForUser(gameId, userId);
  if (!loaded || loaded.game.status !== 'active') return null;
  return loaded;
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

async function onGameJoin(socket: Socket, userId: string, gameId: string): Promise<void> {
  if (typeof gameId !== 'string') return;
  const loaded = await loadForUser(gameId, userId);
  if (!loaded) return;
  socket.join(`game:${gameId}`);
}

async function onMoveMake(
  socket: Socket,
  userId: string,
  payload: MovePayload,
): Promise<void> {
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

  const end = detectGameEnd(chess, color);
  if (end) {
    const winnerId = end.result === 'draw' ? null : userIdForColor(game, end.result);
    applyGameEnd(game, end.result, winnerId, end.reason);
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

  if (end) {
    await applyEloUpdate(game);
    emitGameOver(game, { winner: end.result, reason: end.reason });
  }
}

async function onGameResign(socket: Socket, userId: string, gameId: string): Promise<void> {
  if (typeof gameId !== 'string') return;
  const loaded = await loadActiveGameForUser(gameId, userId);
  if (!loaded) return;
  const { game, color } = loaded;
  const winnerColor = opponent(color);
  await finishGame(game, winnerColor, userIdForColor(game, winnerColor), 'resignation');
}

async function onDrawOffer(socket: Socket, userId: string, gameId: string): Promise<void> {
  if (typeof gameId !== 'string') return;
  const loaded = await loadActiveGameForUser(gameId, userId);
  if (!loaded) return;
  const { game, color } = loaded;
  if (game.drawOffer) return;
  game.drawOffer = { from: new mongoose.Types.ObjectId(userId) };
  await game.save();
  const payload: DrawOfferPayload = { from: color };
  socket.to(`game:${gameId}`).emit(SocketEvents.DRAW_OFFER, payload);
}

async function onDrawAccept(socket: Socket, userId: string, gameId: string): Promise<void> {
  if (typeof gameId !== 'string') return;
  const loaded = await loadActiveGameForUser(gameId, userId);
  if (!loaded) return;
  const { game } = loaded;
  if (!game.drawOffer || game.drawOffer.from.toString() === userId) return;
  await finishGame(game, 'draw', null, 'agreement');
}

async function onDrawDecline(socket: Socket, userId: string, gameId: string): Promise<void> {
  if (typeof gameId !== 'string') return;
  const loaded = await loadActiveGameForUser(gameId, userId);
  if (!loaded) return;
  const { game } = loaded;
  if (!game.drawOffer || game.drawOffer.from.toString() === userId) return;
  game.drawOffer = null;
  await game.save();
  socket.to(`game:${gameId}`).emit(SocketEvents.DRAW_DECLINED);
}

export function registerGameHandlers(socket: Socket): void {
  const userId = socket.data.userId;
  if (!userId) return;

  socket.on(SocketEvents.GAME_JOIN,    (id: string)           => onGameJoin(socket, userId, id));
  socket.on(SocketEvents.MOVE_MAKE,    (payload: MovePayload) => onMoveMake(socket, userId, payload));
  socket.on(SocketEvents.GAME_RESIGN,  (id: string)           => onGameResign(socket, userId, id));
  socket.on(SocketEvents.DRAW_OFFER,   (id: string)           => onDrawOffer(socket, userId, id));
  socket.on(SocketEvents.DRAW_ACCEPT,  (id: string)           => onDrawAccept(socket, userId, id));
  socket.on(SocketEvents.DRAW_DECLINE, (id: string)           => onDrawDecline(socket, userId, id));
}
