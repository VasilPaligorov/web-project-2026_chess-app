import { Request, Response } from 'express';
import { Game } from '../models/Game';
import { PUBLIC_USER_FIELDS } from './game.helpers';

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
