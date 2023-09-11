'use client';

import React from 'react';
import { Line } from 'react-chartjs-2';
import { Chart, registerables} from 'chart.js';

Chart.register(...registerables);


export default function ILChart() {

  function getLiquidity0(x: number, sa: number, sb: number): number {
      return (x * sa * sb) / (sb - sa);
  }

  function getLiquidity1(y: number, sa: number, sb: number): number {
      return y / (sb - sa);
  }

  function getLiquidity(x: number, y: number, sp: number, sa: number, sb: number): number {
      if (sp <= sa) {
          const liquidity = getLiquidity0(x, sa, sb);
          return liquidity;
      } else if (sp < sb) {
          const liquidity0 = getLiquidity0(x, sp, sb);
          const liquidity1 = getLiquidity1(y, sa, sp);
          const liquidity = Math.min(liquidity0, liquidity1);
          return liquidity;
      } else {
          const liquidity = getLiquidity1(y, sa, sb);
          return liquidity;
      }
  }

  function calculateX(L: number, sp: number, sa: number, sb: number): number {
      sp = Math.max(Math.min(sp, sb), sa);
      return (L * (sb - sp)) / (sp * sb);
  }

  function calculateY(L: number, sp: number, sa: number, sb: number): number {
      sp = Math.max(Math.min(sp, sb), sa);
      return L * (sp - sa);
  }

  function calculateAmounts(p: number, a: number, b: number, x: number, y: number, P1: number): [number, number] {
      const sp = Math.sqrt(p);
      const sa = Math.sqrt(a);
      const sb = Math.sqrt(b);
      let L = getLiquidity(x, y, sp, sa, sb);

      const sp1 = Math.sqrt(P1);

      const x1 = calculateX(L, sp1, sa, sb);
      const y1 = calculateY(L, sp1, sa, sb);

      const deltaP = sp1 - sp;
      const deltaInvP = 1 / sp1 - 1 / sp;
      const deltaX = deltaInvP * L;
      const deltaY = deltaP * L;
      const newX = x + deltaX;
      const newY = y + deltaY;

      return [newX, newY];
  }

  function findMaxX(p: number, a: number, b: number, vMax: number): number {
      const sp = Math.sqrt(p);
      const sa = Math.sqrt(a);
      const sb = Math.sqrt(b);
      let x = 0.001; // starting value for x
      const step = 0.001;

      while (true) {
          const L = getLiquidity0(x, sp, sb);
          const y = calculateY(L, sp, sa, sb);
          const v = x * p + y;
          if (v >= vMax) {
              break;
          }
          x += step;
      }

      return x - step;
  }

  function findEqualPnlValues(
      p: number,
      a: number,
      b: number,
      P1: number,
      shortPrice: number,
      maximumValue: number
  ): [number | null, number | null] {
      const tolerance = 0.1; // a small tolerance for comparing PNLs; adjust as needed
      const step = 0.1; // the step size for our loop, making our results 10 times finer

      let initialPortfolioValueV3 = 0;

      while (initialPortfolioValueV3 <= maximumValue) {
          // Calculate PNL_V3
          const x = findMaxX(p, a, b, initialPortfolioValueV3);
          const y = initialPortfolioValueV3 - x * p;
          const [x1, y1] = calculateAmounts(p, a, b, x, y, P1);
          const value = x * p + y;
          const value1 = x1 * P1 + y1;
          const PNL_V3 = value1 - value;

          // Calculate PNL_short
          const initialPortfolioValueShort = maximumValue - initialPortfolioValueV3;
          const profitLoss = (shortPrice - P1) / shortPrice;
          const PNL_short = initialPortfolioValueShort * profitLoss;

          // Check if the PNLs are approximately equal
          if (Math.abs(PNL_V3 + PNL_short) <= tolerance) {
              return [initialPortfolioValueV3, initialPortfolioValueShort];
          }

          initialPortfolioValueV3 += step;
      }

      return [0, 0];
  }

  type CombinedPlotResult = {
    P1_values: number[],
    values_original: number[],
    values_combined: number[]
  };
  

  function combinedPlot(p: number, a: number, b: number, maximumPortfolioValue: number): CombinedPlotResult {
    let [initial_portfolio_value_v3, initial_portfolio_value_short] = findEqualPnlValues(p, a, b, a, short_price, maximumPortfolioValue);

    if (initial_portfolio_value_v3 && initial_portfolio_value_short !== null) {
        initial_portfolio_value_v3 *= 1.25;
        initial_portfolio_value_short *= 0.75;
      
        const x = findMaxX(p, a, b, initial_portfolio_value_v3);
        const y = maximumPortfolioValue - x * p;
      
        const P1_values: number[] = [];
        const values_original: number[] = [];
        const values_combined: number[] = [];
      
        for (let P1 = 500; P1 <= 1500; P1++) {
          const [x1, y1] = calculateAmounts(p, a, b, x, y, P1);
          const value_original = x1 * P1 + y1;
          const profit_loss = (short_price - P1) / short_price;
          const PNL_short = initial_portfolio_value_short * profit_loss * leverage;
          const value_combined = value_original + PNL_short;
      
          P1_values.push(P1);
          values_original.push(value_original);
          values_combined.push(value_combined);
        }
      return {
        P1_values,
        values_original,
        values_combined
      }
    } else {
      return {
        P1_values: [],
        values_original: [],
        values_combined: []
    };
    }
  }
  
  const leverage = 1;
  const p = 1000;
  const a = 900;
  const b = 1100;
  const short_price = 1000;
  const maximumPortfolioValue = 1000;

  const data = combinedPlot(p, a, b, maximumPortfolioValue);

  const chartData = {
    labels: data.P1_values,
    datasets: [
        {
            label: 'Original Values',
            data: data.values_original,
            borderColor: 'rgba(75,192,192,1)',
            fill: false,
        },
        {
            label: 'Combined Values',
            data: data.values_combined,
            borderColor: 'rgba(255,99,132,1)',
            fill: false,
        },
    ],
};

return (
    <>
        <div className="mt-8">
            <h1>Impermanent Loss</h1>
            <h2>HEDGE</h2>
            <div className="chart-container" style={{ width: '80%', height: '400px' }}>
                <Line data={chartData} />
            </div>
        </div>
    </>
);
};
