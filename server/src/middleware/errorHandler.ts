import { ErrorRequestHandler } from 'express';

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  console.error(`[${req.method} ${req.path}]`, err);
  res.status(500).json({ success: false, message: 'Internal server error' });
};
