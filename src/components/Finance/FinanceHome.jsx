/**
 * FinanceHome.jsx
 * Accueil Finances : solde actuel + courbe (plus haut / plus bas) puis indicateurs
 * CA, gains, dépenses, bénéfice, perte sur la période choisie.
 *
 * La courbe est reconstituée à rebours : on part du solde actuel puis on retire
 * les transactions de la plus récente à la plus ancienne.
 */

import React, { useMemo, useState } from 'react';
import {
  Box, Card, CardBody, HStack, VStack, Heading, Text, SimpleGrid, Stat, StatLabel, StatNumber,
  StatHelpText, ButtonGroup, Button, Badge, useColorModeValue
} from '@chakra-ui/react';

const PERIODS = [
  { key: '1m', label: '1 mois', months: 1 },
  { key: '3m', label: '3 mois', months: 3 },
  { key: '6m', label: '6 mois', months: 6 },
  { key: '1y', label: '12 mois', months: 12 },
  { key: 'all', label: 'Tout', months: null }
];

const INVOICE_ISSUED = ['SENT', 'ACCEPTED', 'PENDING_PAYMENT', 'DEPOSIT_PAID', 'PAID'];
const dayKey = (d) => new Date(d).toISOString().slice(0, 10);
const shortDate = (ms) => new Date(ms).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' });

const txDate = (t) => new Date(t.date || t.createdAt);
const signed = (t) => (t.type === 'CREDIT' ? 1 : -1) * Math.abs(Number(t.amount) || 0);

/** Série [{t: ms, v: solde}] triée par date, un point par jour + aujourd'hui. */
export const buildBalanceSeries = (transactions = [], currentBalance = 0) => {
  const valid = transactions
    .filter(t => t && !Number.isNaN(txDate(t).getTime()))
    .sort((a, b) => txDate(a) - txDate(b));

  const byDay = new Map(); // dernier solde connu de chaque jour
  let running = Number(currentBalance) || 0;
  for (let i = valid.length - 1; i >= 0; i--) {
    const key = dayKey(txDate(valid[i]));
    if (!byDay.has(key)) byDay.set(key, running);
    running -= signed(valid[i]);
  }

  const points = Array.from(byDay.entries())
    .map(([key, v]) => ({ t: new Date(`${key}T23:59:59`).getTime(), v }))
    .sort((a, b) => a.t - b.t);

  if (valid.length) {
    points.unshift({ t: new Date(`${dayKey(txDate(valid[0]))}T00:00:00`).getTime() - 1, v: running });
  }
  const now = Date.now();
  if (!points.length || points[points.length - 1].t < now) points.push({ t: now, v: Number(currentBalance) || 0 });
  return points;
};

function BalanceChart({ points, formatCurrency }) {
  const [hover, setHover] = useState(null);
  const lineColor = useColorModeValue('#2b6cb0', '#63b3ed');
  const gridColor = useColorModeValue('#e2e8f0', '#2d3748');
  const textColor = useColorModeValue('#718096', '#a0aec0');

  const W = 900;
  const H = 280;
  const pad = { l: 64, r: 16, t: 16, b: 28 };

  if (points.length < 2) {
    return <Text color="gray.500" py={10} textAlign="center">Pas assez de données pour tracer la courbe.</Text>;
  }

  const minT = points[0].t;
  const maxT = points[points.length - 1].t;
  const values = points.map(p => p.v);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const span = maxV - minV || 1;
  const yMin = minV - span * 0.08;
  const yMax = maxV + span * 0.08;

  const x = (t) => pad.l + ((t - minT) / (maxT - minT || 1)) * (W - pad.l - pad.r);
  const y = (v) => pad.t + (1 - (v - yMin) / (yMax - yMin)) * (H - pad.t - pad.b);

  // courbe en escalier : le solde reste constant jusqu'à la prochaine opération
  const path = points.map((p, i) => (i === 0 ? `M${x(p.t)},${y(p.v)}` : `L${x(p.t)},${y(points[i - 1].v)} L${x(p.t)},${y(p.v)}`)).join(' ');
  const area = `${path} L${x(maxT)},${H - pad.b} L${x(minT)},${H - pad.b} Z`;

  const maxPoint = points.reduce((a, b) => (b.v > a.v ? b : a));
  const minPoint = points.reduce((a, b) => (b.v < a.v ? b : a));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => yMin + (yMax - yMin) * f);
  const zeroVisible = yMin < 0 && yMax > 0;

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const t = minT + ((px - pad.l) / (W - pad.l - pad.r)) * (maxT - minT);
    let best = points[0];
    for (const p of points) if (p.t <= t) best = p;
    setHover(best);
  };

  return (
    <Box position="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label="Courbe du solde"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        {ticks.map((v, i) => (
          <g key={i}>
            <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke={gridColor} />
            <text x={pad.l - 8} y={y(v) + 4} fontSize="11" textAnchor="end" fill={textColor}>
              {Math.round(v).toLocaleString('fr-FR')} €
            </text>
          </g>
        ))}
        {zeroVisible && <line x1={pad.l} x2={W - pad.r} y1={y(0)} y2={y(0)} stroke="#e53e3e" strokeDasharray="4 4" />}
        <text x={pad.l} y={H - 8} fontSize="11" fill={textColor}>{shortDate(minT)}</text>
        <text x={W - pad.r} y={H - 8} fontSize="11" textAnchor="end" fill={textColor}>{shortDate(maxT)}</text>

        <path d={area} fill={lineColor} opacity="0.12" />
        <path d={path} fill="none" stroke={lineColor} strokeWidth="2.5" strokeLinejoin="round" />

        <circle cx={x(maxPoint.t)} cy={y(maxPoint.v)} r="6" fill="#38a169" stroke="#fff" strokeWidth="2" />
        <circle cx={x(minPoint.t)} cy={y(minPoint.v)} r="6" fill="#e53e3e" stroke="#fff" strokeWidth="2" />

        {hover && (
          <g>
            <line x1={x(hover.t)} x2={x(hover.t)} y1={pad.t} y2={H - pad.b} stroke={textColor} strokeDasharray="3 3" />
            <circle cx={x(hover.t)} cy={y(hover.v)} r="4.5" fill={lineColor} stroke="#fff" strokeWidth="2" />
          </g>
        )}
      </svg>
      {hover && (
        <Box
          position="absolute" top={1} right={2} px={3} py={1} borderRadius="md" fontSize="sm"
          bg="blackAlpha.800" color="white" pointerEvents="none"
        >
          {shortDate(hover.t)} : <strong>{formatCurrency(hover.v)}</strong>
        </Box>
      )}
    </Box>
  );
}

function Indicator({ label, value, help, color, formatCurrency }) {
  return (
    <Card variant="outline">
      <CardBody py={3}>
        <Stat>
          <StatLabel>{label}</StatLabel>
          <StatNumber color={color} fontSize="xl">{formatCurrency(value)}</StatNumber>
          {help && <StatHelpText mb={0}>{help}</StatHelpText>}
        </Stat>
      </CardBody>
    </Card>
  );
}

export default function FinanceHome({
  balance = 0, lastBalanceUpdate = null, transactions = [], documents = [], formatCurrency, formatDate
}) {
  const [period, setPeriod] = useState('3m');
  const cardBg = useColorModeValue('white', 'gray.800');

  const series = useMemo(() => buildBalanceSeries(transactions, balance), [transactions, balance]);

  const range = useMemo(() => {
    const p = PERIODS.find(x => x.key === period);
    if (!p?.months) return { from: -Infinity, to: Infinity };
    const from = new Date();
    from.setMonth(from.getMonth() - p.months);
    return { from: from.getTime(), to: Infinity };
  }, [period]);

  const chartPoints = useMemo(() => {
    if (range.from === -Infinity) return series;
    const before = [...series].filter(pt => pt.t < range.from).pop();
    const inside = series.filter(pt => pt.t >= range.from);
    const start = before ? [{ t: range.from, v: before.v }] : [];
    return [...start, ...inside];
  }, [series, range]);

  const stats = useMemo(() => {
    const inPeriod = (d) => {
      const ms = new Date(d).getTime();
      return !Number.isNaN(ms) && ms >= range.from && ms <= range.to;
    };
    const txs = transactions.filter(t => inPeriod(t.date || t.createdAt));
    const gains = txs.filter(t => t.type === 'CREDIT').reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0);
    const expenses = txs.filter(t => t.type === 'DEBIT').reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0);

    const invoices = documents.filter(d => d.type === 'INVOICE' && INVOICE_ISSUED.includes(d.invoiceStatus || d.status) && inPeriod(d.date));
    const revenue = invoices.reduce((s, d) => s + (Number(d.amount) || 0), 0);
    const collected = invoices.filter(d => (d.invoiceStatus || d.status) === 'PAID').reduce((s, d) => s + (Number(d.amount) || 0), 0);

    const result = gains - expenses;
    return { gains, expenses, revenue, collected, invoiceCount: invoices.length, result, profit: Math.max(0, result), loss: Math.max(0, -result) };
  }, [transactions, documents, range]);

  const hi = chartPoints.length ? chartPoints.reduce((a, b) => (b.v > a.v ? b : a)) : null;
  const lo = chartPoints.length ? chartPoints.reduce((a, b) => (b.v < a.v ? b : a)) : null;
  const periodLabel = PERIODS.find(x => x.key === period)?.label;

  return (
    <VStack spacing={4} align="stretch">
      <Card bg={cardBg}>
        <CardBody>
          <HStack justify="space-between" align="flex-start" wrap="wrap" mb={3} spacing={4}>
            <Box>
              <Text fontSize="sm" color="gray.500">Solde actuel</Text>
              <Heading size="xl" color={balance >= 0 ? 'green.600' : 'red.600'}>{formatCurrency(balance)}</Heading>
              {lastBalanceUpdate && <Text fontSize="xs" color="gray.500">MAJ : {formatDate(lastBalanceUpdate)}</Text>}
            </Box>
            <HStack spacing={6}>
              {hi && (
                <Box textAlign="right">
                  <Badge colorScheme="green">Plus haut solde</Badge>
                  <Text fontWeight="bold">{formatCurrency(hi.v)}</Text>
                  <Text fontSize="xs" color="gray.500">{shortDate(hi.t)}</Text>
                </Box>
              )}
              {lo && (
                <Box textAlign="right">
                  <Badge colorScheme="red">Plus bas solde</Badge>
                  <Text fontWeight="bold">{formatCurrency(lo.v)}</Text>
                  <Text fontSize="xs" color="gray.500">{shortDate(lo.t)}</Text>
                </Box>
              )}
            </HStack>
          </HStack>

          <HStack justify="space-between" mb={2} wrap="wrap">
            <Text fontSize="xs" color="gray.500">Reconstitué à partir du solde actuel et des transactions.</Text>
            <ButtonGroup size="xs" isAttached variant="outline">
              {PERIODS.map(p => (
                <Button key={p.key} onClick={() => setPeriod(p.key)} colorScheme={period === p.key ? 'blue' : 'gray'} variant={period === p.key ? 'solid' : 'outline'}>
                  {p.label}
                </Button>
              ))}
            </ButtonGroup>
          </HStack>
          <BalanceChart points={chartPoints} formatCurrency={formatCurrency} />
        </CardBody>
      </Card>

      <SimpleGrid columns={{ base: 2, md: 3, xl: 6 }} spacing={3}>
        <Indicator formatCurrency={formatCurrency} label="Chiffre d'affaires" value={stats.revenue}
          help={`${stats.invoiceCount} facture(s) · ${formatCurrency(stats.collected)} encaissé`} color="blue.600" />
        <Indicator formatCurrency={formatCurrency} label="Gains (recettes)" value={stats.gains} help={periodLabel} color="green.600" />
        <Indicator formatCurrency={formatCurrency} label="Dépenses" value={stats.expenses} help={periodLabel} color="red.600" />
        <Indicator formatCurrency={formatCurrency} label="Bénéfice" value={stats.profit}
          help={stats.result >= 0 ? 'Gains − dépenses' : 'Aucun bénéfice'} color="green.600" />
        <Indicator formatCurrency={formatCurrency} label="Perte" value={stats.loss}
          help={stats.result < 0 ? 'Dépenses − gains' : 'Aucune perte'} color="red.600" />
        <Indicator formatCurrency={formatCurrency} label="Résultat net" value={stats.result} help={periodLabel}
          color={stats.result >= 0 ? 'green.600' : 'red.600'} />
      </SimpleGrid>
    </VStack>
  );
}
