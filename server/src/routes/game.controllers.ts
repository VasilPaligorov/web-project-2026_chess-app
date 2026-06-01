import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Game } from '../models/Game';
import { getIO } from '../socket/io';
import { PUBLIC_USER_FIELDS, inGameQuery, parseObjectId } from './game.helpers';

export async function createGame(req: Request, res: Response) {
  const userId = req.user!.userId;

  if (await Game.exists(inGameQuery(userId))) {
    res.status(409).json({ success: false, message: 'You are already in a game' });
    return;
  }

  const game = await Game.create({ whitePlayer: userId });
  const populated = await game.populate('whitePlayer', PUBLIC_USER_FIELDS);
  getIO().emit('lobby:changed');
  res.status(201).json({ success: true, data: populated });
}

export async function listWaitingGames(_req: Request, res: Response) {
  const games = await Game.find({ status: 'waiting' })
    .populate('whitePlayer', PUBLIC_USER_FIELDS)
    .sort({ createdAt: -1 });
  res.json({ success: true, data: games });
}

export async function getCurrentGame(req: Request, res: Response) {
  const userId = req.user!.userId;
  const game = await Game.findOne(inGameQuery(userId))
    .populate('whitePlayer', PUBLIC_USER_FIELDS)
    .populate('blackPlayer', PUBLIC_USER_FIELDS);
  res.json({ success: true, data: game });
}

export async function getSpectateGame(req: Request, res: Response) {
  const game = await Game.findOne({ spectatorToken: req.params.token })
    .populate('whitePlayer', PUBLIC_USER_FIELDS)
    .populate('blackPlayer', PUBLIC_USER_FIELDS)
    .populate('winner', PUBLIC_USER_FIELDS);

  if (!game) {
    res.status(404).json({ success: false, message: 'Game not found' });
    return;
  }
  res.json({ success: true, data: game });
}

export async function getGameById(req: Request, res: Response) {
  const id = parseObjectId(req.params.id);
  if (!id) {
    res.status(400).json({ success: false, message: 'Invalid game id' });
    return;
  }

  const game = await Game.findById(id)
    .populate('whitePlayer', PUBLIC_USER_FIELDS)
    .populate('blackPlayer', PUBLIC_USER_FIELDS)
    .populate('winner', PUBLIC_USER_FIELDS);

  if (!game) {
    res.status(404).json({ success: false, message: 'Game not found' });
    return;
  }
  res.json({ success: true, data: game });
}

export async function joinGame(req: Request, res: Response) {
  const userId = req.user!.userId;
  const id = parseObjectId(req.params.id);
  if (!id) {
    res.status(400).json({ success: false, message: 'Invalid game id' });
    return;
  }

  if (await Game.exists(inGameQuery(userId))) {
    res.status(409).json({ success: false, message: 'You are already in a game' });
    return;
  }

  const game = await Game.findOneAndUpdate(
    {
      _id: id,
      status: 'waiting',
      whitePlayer: { $ne: new Types.ObjectId(userId) },
    },
    { $set: { blackPlayer: userId, status: 'active', lastMoveAt: new Date() } },
    { new: true }
  )
    .populate('whitePlayer', PUBLIC_USER_FIELDS)
    .populate('blackPlayer', PUBLIC_USER_FIELDS);

  if (!game) {
    res.status(409).json({
      success: false,
      message: 'Game is not joinable (already started, missing, or your own)',
    });
    return;
  }

  const whiteId = String(game.whitePlayer._id);
  const blackId = String(game.blackPlayer!._id);
  const io = getIO();
  io.to([`user:${whiteId}`, `user:${blackId}`]).emit('game:start', game);
  io.emit('lobby:changed');

  res.json({ success: true, data: game });
}

export async function cancelGame(req: Request, res: Response) {
  const userId = req.user!.userId;
  const id = parseObjectId(req.params.id);
  if (!id) {
    res.status(400).json({ success: false, message: 'Invalid game id' });
    return;
  }

  const result = await Game.findOneAndDelete({
    _id: id,
    status: 'waiting',
    whitePlayer: userId,
  });

  if (!result) {
    res.status(404).json({
      success: false,
      message: 'Waiting game not found or you are not the creator',
    });
    return;
  }

  getIO().emit('lobby:changed');
  res.json({ success: true, message: 'Game cancelled' });
}
