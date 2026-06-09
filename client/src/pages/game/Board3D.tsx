// @ts-nocheck
import React, { useState } from 'react';
import type { FC } from 'react';

import { MeshWrapper } from './models/index';
import { TileComponent } from './models/Tile';
import { Border } from './models/Border';
import { PawnModel } from './models/Pawn';
import { RookComponent } from './models/Rook';
import { KnightComponent } from './models/Knight';
import { BishopComponent } from './models/Bishop';
import { QueenComponent } from './models/Queen';
import { KingComponent } from './models/King';

interface Board3DProps {
  fen: string;
  onMove: (from: string, to: string) => void;
  myColor: 'white' | 'black';
  isMyTurn: boolean;
}

function parseFenToBoard(fen: string) {
  const rows = fen.split(' ')[0].split('/');
  return rows.map((row) => {
    const boardRow: any[] = [];
    for (let char of row) {
      if (isNaN(Number(char))) {
        const color = char === char.toUpperCase() ? 'white' : 'black';
        const typeMap: Record<string, string> = { p: 'pawn', r: 'rook', n: 'knight', b: 'bishop', q: 'queen', k: 'king' };
        boardRow.push({ type: typeMap[char.toLowerCase()], color });
      } else {
        for (let i = 0; i < Number(char); i++) boardRow.push(null);
      }
    }
    return boardRow;
  });
}

export const Board3D: FC<Board3DProps> = ({ fen, onMove, myColor, isMyTurn }) => {
  const boardMatrix = parseFenToBoard(fen);
  const [selectedSquare, setSelectedSquare] = useState<{ x: number; y: number } | null>(null);

  const convertCoordsToSquare = (x: number, y: number): string => {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
    return files[x] + ranks[y];
  };

  const handleTileClick = (x: number, y: number) => {
    if (!isMyTurn) return;

    if (selectedSquare) {
      if (selectedSquare.x === x && selectedSquare.y === y) {
        setSelectedSquare(null);
        return;
      }
      onMove(convertCoordsToSquare(selectedSquare.x, selectedSquare.y), convertCoordsToSquare(x, y));
      setSelectedSquare(null);
    } else {
      const piece = boardMatrix[y][x];
      if (piece && piece.color === myColor) {
        setSelectedSquare({ x, y });
      }
    }
  };

  return (
  <group rotation={[0, myColor === 'black' ? Math.PI : 0, 0]}>
    <group position={[-3.5, 0, -3.5]}>
      <Border />

      {boardMatrix.map((row, y) => 
        row.map((piece, x) => {
          const isTileBlack = (x + y) % 2 === 1;
          const isSelected = selectedSquare?.x === x && selectedSquare?.y === y;

          return (
            <group key={`${x}-${y}`}>
              <TileComponent 
                color={isTileBlack ? 'black' : 'white'} 
                position={[x, 0, y]} 
                onClick={(e: any) => { e.stopPropagation(); handleTileClick(x, y); }} 
              />
              {piece && (
                <MeshWrapper
                  position={[x, 0.1, y]}
                  color={piece.color}
                  isSelected={isSelected}
                  onClick={(e: any) => { e.stopPropagation(); handleTileClick(x, y); }}
                >
                  {piece.type === 'pawn' && <PawnModel color={piece.color} />}
                  {piece.type === 'rook' && <RookComponent color={piece.color} />}
                  {piece.type === 'knight' && <KnightComponent color={piece.color} />}
                  {piece.type === 'bishop' && <BishopComponent color={piece.color} />}
                  {piece.type === 'queen' && <QueenComponent color={piece.color} />}
                  {piece.type === 'king' && <KingComponent color={piece.color} />}
                </MeshWrapper>
              )}
            </group>
          );
        })
      )}
    </group>
  </group>
  );
};
