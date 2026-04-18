import { Chessboard } from 'react-chessboard';

export default function GamePage() {
  return (
    <div>
      <Chessboard id="game-board" boardWidth={500} />
    </div>
  );
}
