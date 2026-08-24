import React, { useState } from 'react';
import { Lock, Unlock, Sparkles, Target, Trophy, Calendar, MapPin, Wallet, Check, AlertTriangle, X, TrendingUp, Users, Hash, Plus, Umbrella } from 'lucide-react';
import type { Goal, GoalCategory, SaccoHolding, ChamaFrequency } from '../types';
import { GOAL_META, getGoalProgress, getGoalDeadlineStatus, projectGoalDate, projectGoalInterest, computeChamaPlan, projectEndowment } from '../hooks/goals';
import { formatCurrency } from '../utils/expenses';
import { IconSelect } from './ui/IconSelect';
import { Modal } from './ui/Modal';

interface GoalsProps {
  goals: Goal[];
  activeGoals: Goal[];
  completedGoals: Goal[];
  totalTargeted: number;
  totalSaved: number;
  onAdd: (data: Omit<Goal, 'id' | 'createdAt' | 'completed'>) => void;
  onRemove: (id: string) => void;
  onContribute: (id: string, amount: number) => void;
  onUpdateSaved: (id: string, amount: number) => void;
  currency: string;
  maxGoals?: number;
  onUpgrade?: () => void;
  onUpdate?: (id: string, patch: Partial<Omit<Goal, 'id' | 'createdAt'>>) => void;
}

export const Goals: React.FC<GoalsProps> = ({
  goals, activeGoals, completedGoals, totalTargeted, totalSaved,
  onAdd, onRemove, onContribute, currency, maxGoals, onUpgrade, onUpdate,
}) => {
  const [name, setName]         = useState('');
  const [target, setTarget]     = useState('');
  const [saved, setSaved]       = useState('');
  const [monthly, setMonthly]   = useState('');
  const [category, setCategory] = useState<GoalCategory>('emergency');
  const [deadline, setDeadline] = useState('');
  const [notes, setNotes]       = useState('');
  const [institution, setInstitution] = useState('');
  const [saccoHolding, setSaccoHolding] = useState<SaccoHolding>('dividends');
  const [interestRate, setInterestRate] = useState('');
  const [lockedIn, setLockedIn] = useState(false);
  const [lockYears, setLockYears] = useState('');
  const [endowmentType, setEndowmentType] = useState<'regular' | 'anticipated'>('regular');
  const [termYears, setTermYears] = useState('10');
  const [payoutInterval, setPayoutInterval] = useState('5');
  const [chamaMembers, setChamaMembers] = useState('');
  const [chamaPosition, setChamaPosition] = useState('');
  const [chamaFrequency, setChamaFrequency] = useState<ChamaFrequency>('monthly');
  const [chamaContribution, setChamaContribution] = useState('');
  const [contributeId, setContributeId] = useState<string | null>(null);
  const [contributeAmt, setContributeAmt] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Savings-vehicle goals capture where the money sits (provider/SACCO/chama/insurer).
  const VEHICLE_CATEGORIES: GoalCategory[] = ['mmf', 'sacco', 'chama', 'insurance', 'bankSavings'];
  const isVehicle = VEHICLE_CATEGORIES.includes(category);
  // MMF, SACCO & bank savings earn interest/dividends, so they get a rate + lock-in + growth projection.
  const isInterestVehicle = category === 'mmf' || category === 'sacco' || category === 'bankSavings';
  const isChama = category === 'chama';
  const isEndowment = category === 'insurance';
  const institutionLabel =
    category === 'sacco' ? 'Which SACCO?'
    : category === 'chama' ? 'Which chama / group?'
    : category === 'mmf' ? 'MMF provider'
    : category === 'insurance' ? 'Insurer / cover name'
    : category === 'bankSavings' ? 'Which bank?'
    : 'Provider';

  // Live projection preview for the form, before the goal is saved.
  const formProjection = isInterestVehicle
    ? projectGoalInterest({
        deadline,
        interestRate: parseFloat(interestRate) || 0,
        savedAmount: parseFloat(saved.replace(/,/g, '') || '0'),
        monthlyContribution: parseFloat(monthly.replace(/,/g, '') || '0'),
      } as Goal)
    : null;

  const formChamaPlan = isChama
    ? computeChamaPlan({
        chamaMembers: parseInt(chamaMembers) || 0,
        chamaContribution: parseFloat(chamaContribution.replace(/,/g, '')) || 0,
        chamaFrequency,
        chamaPosition: parseInt(chamaPosition) || 0,
      } as Goal)
    : null;

  const resetForm = () => {
    setName(''); setTarget(''); setSaved(''); setMonthly(''); setDeadline(''); setNotes(''); setInstitution('');
    setInterestRate(''); setLockedIn(false); setLockYears('');
    setEndowmentType('regular'); setTermYears('10'); setPayoutInterval('5');
    setChamaMembers(''); setChamaPosition(''); setChamaContribution(''); setChamaFrequency('monthly');
    setCategory('emergency'); setSaccoHolding('dividends');
  };

  const buildPayload = (): Omit<Goal, 'id' | 'createdAt' | 'completed'> => {
    const tgt = parseFloat(target.replace(/,/g, ''));
    const sav = parseFloat(saved.replace(/,/g, '') || '0');
    const mon = parseFloat(monthly.replace(/,/g, '') || '0');
    const rate = parseFloat(interestRate) || 0;
    const ly = parseInt(lockYears) || 0;
    return {
      name: name.trim(), targetAmount: tgt, savedAmount: sav, category,
      deadline: isEndowment ? '' : deadline, monthlyContribution: mon, notes,
      ...(isVehicle && institution.trim() ? { institution: institution.trim() } : {}),
      ...(category === 'sacco' ? { saccoHolding } : {}),
      ...(isInterestVehicle && rate > 0 ? { interestRate: rate } : {}),
      ...(isInterestVehicle ? { lockedIn } : {}),
      ...(isInterestVehicle && lockedIn && ly > 0 ? { lockYears: ly } : {}),
      ...(isEndowment ? {
        endowmentType,
        termYears: parseInt(termYears) || 10,
        interestRate: rate,
        ...(endowmentType === 'anticipated' ? { payoutIntervalYears: parseInt(payoutInterval) || 5 } : {}),
      } : {}),
      ...(isChama ? {
        chamaMembers: parseInt(chamaMembers) || 0,
        chamaContribution: parseFloat(chamaContribution.replace(/,/g, '')) || 0,
        chamaFrequency,
        ...(parseInt(chamaPosition) > 0 ? { chamaPosition: parseInt(chamaPosition) } : {}),
      } : {}),
    };
  };

  const handleSave = () => {
    const tgt = parseFloat(target.replace(/,/g, ''));
    if (!name.trim() || isNaN(tgt) || tgt <= 0 || (goalLimitReached && !editId)) return;
    const payload = buildPayload();
    if (editId) onUpdate?.(editId, payload); else onAdd(payload);
    resetForm(); setEditId(null); setShowForm(false);
  };

  const openEdit = (goal: Goal) => {
    setEditId(goal.id);
    setName(goal.name); setTarget(String(goal.targetAmount)); setSaved(String(goal.savedAmount));
    setMonthly(String(goal.monthlyContribution || '')); setDeadline(goal.deadline || ''); setNotes(goal.notes || '');
    setCategory(goal.category); setInstitution(goal.institution || '');
    setInterestRate(goal.interestRate != null ? String(goal.interestRate) : '');
    setLockedIn(!!goal.lockedIn); setLockYears(goal.lockYears != null ? String(goal.lockYears) : '');
    setSaccoHolding(goal.saccoHolding || 'dividends');
    setEndowmentType(goal.endowmentType || 'regular');
    setTermYears(goal.termYears != null ? String(goal.termYears) : '10');
    setPayoutInterval(goal.payoutIntervalYears != null ? String(goal.payoutIntervalYears) : '5');
    setChamaMembers(goal.chamaMembers != null ? String(goal.chamaMembers) : '');
    setChamaPosition(goal.chamaPosition != null ? String(goal.chamaPosition) : '');
    setChamaContribution(goal.chamaContribution != null ? String(goal.chamaContribution) : '');
    setChamaFrequency(goal.chamaFrequency || 'monthly');
    setShowForm(true);
  };

  const handleContribute = (id: string) => {
    const amt = parseFloat(contributeAmt.replace(/,/g, ''));
    if (isNaN(amt) || amt <= 0) return;
    onContribute(id, amt);
    setContributeId(null); setContributeAmt('');
  };

  const overallPct = totalTargeted > 0 ? Math.round((totalSaved / totalTargeted) * 100) : 0;
  const goalLimitReached = typeof maxGoals === 'number' && goals.length >= maxGoals;

  return (
    <div style={S.container} className="animate-in">

      {/* Summary bar */}
      <div className="goals-summary-bar">
        {[
          { label: 'Active Goals',     val: activeGoals.length,                         unit: '',    color: 'var(--blue)' },
          { label: 'Total Targeted',   val: formatCurrency(totalTargeted, currency),     unit: '',    color: 'var(--text-1)' },
          { label: 'Total Saved',      val: formatCurrency(totalSaved, currency),        unit: '',    color: 'var(--green)' },
          { label: 'Goals Completed',  val: completedGoals.length,                       unit: '',    color: 'var(--gold)' },
        ].map((s) => (
          <div key={s.label} style={S.summaryItem}>
            <div style={S.summaryLabel}>{s.label}</div>
            <div style={{ ...S.summaryVal, color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Overall progress */}
      {goals.length > 0 && (
        <div style={S.overallCard}>
          <div style={S.overallLeft}>
            <div style={S.cardTitle}>Overall Progress</div>
            <div style={S.overallAmt}>{formatCurrency(totalSaved, currency)} <span style={S.overallOf}>of {formatCurrency(totalTargeted, currency)}</span></div>
          </div>
          <div style={S.overallRight}>
            <svg width="72" height="72" viewBox="0 0 72 72">
              <circle cx="36" cy="36" r="28" fill="none" stroke="var(--border)" strokeWidth="8" />
              <circle cx="36" cy="36" r="28" fill="none" stroke="var(--gold)" strokeWidth="8"
                strokeDasharray={`${(overallPct / 100) * 176} 176`}
                strokeLinecap="round" transform="rotate(-90 36 36)"
                style={{ filter: 'drop-shadow(0 0 4px rgba(201,168,76,0.5))' }} />
              <text x="36" y="40" textAnchor="middle" fill="var(--gold)" fontSize="13" fontFamily="Cormorant Garamond" fontWeight="700">{overallPct}%</text>
            </svg>
          </div>
        </div>
      )}

      {/* Add trigger */}
      <button style={S.addTriggerBtn} onClick={() => { resetForm(); setEditId(null); setShowForm(true); }}>
        <Plus size={18} strokeWidth={2.6} /> Add Investment
      </button>

      {/* Add / Edit form modal */}
      <Modal open={showForm} onClose={() => { setShowForm(false); setEditId(null); resetForm(); }} title={editId ? 'Edit Investment' : 'Add Investment'}>
        {(goalLimitReached && !editId) && <div style={{ marginBottom: 12 }}><span style={S.limitTag}><Lock size={12} /> Free plan limit</span></div>}
        {(goalLimitReached && !editId) && (
          <div style={S.upgradePrompt}>
            <div style={S.upgradeIcon}><Sparkles size={18} /></div>
            <div style={{ flex: 1 }}>
              <div style={S.upgradeTitle}>Your first goal is active. Silver unlocks unlimited planning.</div>
              <div style={S.upgradeText}>Add more goals, plan deadlines, and track emergency fund progress without replacing your current goal.</div>
            </div>
            {onUpgrade && <button style={S.upgradeBtn} onClick={onUpgrade}>Upgrade to Silver</button>}
          </div>
        )}
        <div className="goals-form-grid">
          <div style={S.field}>
            <label style={S.label}>Goal Name</label>
            <input style={S.input} placeholder="e.g. Mombasa Vacation" value={name} onChange={(e) => setName(e.target.value)} disabled={goalLimitReached && !editId} />
          </div>
          <div style={S.field}>
            <label style={S.label}>Category</label>
            <IconSelect
              value={category}
              onChange={(v) => setCategory(v)}
              disabled={goalLimitReached && !editId}
              options={(Object.entries(GOAL_META) as [GoalCategory, typeof GOAL_META[GoalCategory]][])
                .map(([key, m]) => ({ value: key, label: m.label, icon: m.icon, color: m.color }))}
            />
          </div>
          <div style={S.field}>
            <label style={S.label}>Target Amount (KSh)</label>
            <input style={S.input} type="number" placeholder="e.g. 150000" value={target} onChange={(e) => setTarget(e.target.value)} disabled={goalLimitReached && !editId} />
          </div>
          <div style={S.field}>
            <label style={S.label}>Already Saved (KSh)</label>
            <input style={S.input} type="number" placeholder="0" value={saved} onChange={(e) => setSaved(e.target.value)} disabled={goalLimitReached && !editId} />
          </div>
          <div style={S.field}>
            <label style={S.label}>Monthly Contribution (KSh)</label>
            <input style={S.input} type="number" placeholder="e.g. 5000" value={monthly} onChange={(e) => setMonthly(e.target.value)} disabled={goalLimitReached && !editId} />
          </div>
          {!isEndowment && (
            <div style={S.field}>
              <label style={S.label}>Deadline (optional)</label>
              <input style={S.input} type="month" value={deadline} onChange={(e) => setDeadline(e.target.value)} disabled={goalLimitReached && !editId}
                // style={{ ...S.input, colorScheme: 'dark' }}
              />
            </div>
          )}

          {isVehicle && (
            <div style={S.field}>
              <label style={S.label}>{institutionLabel}</label>
              <input style={S.input} placeholder={category === 'sacco' ? 'e.g. Stima, Mwalimu, Hazina' : category === 'mmf' ? 'e.g. Ziidi, CIC, Cytonn' : category === 'insurance' ? 'e.g. NHIF/SHA, Jubilee' : category === 'bankSavings' ? 'e.g. Equity, KCB, Co-op' : 'e.g. Office chama'}
                value={institution} onChange={(e) => setInstitution(e.target.value)} disabled={goalLimitReached && !editId} />
            </div>
          )}

          {isEndowment && (
            <>
              <div style={S.field}>
                <label style={S.label}>Endowment type</label>
                <div style={S.holdingRow}>
                  {(['regular', 'anticipated'] as const).map((t) => (
                    <button key={t} type="button" disabled={goalLimitReached && !editId} onClick={() => setEndowmentType(t)}
                      style={{ ...S.holdingBtn, ...(endowmentType === t ? S.holdingBtnActive : {}) }}>
                      {t === 'regular' ? 'Regular' : 'Anticipated'}
                    </button>
                  ))}
                </div>
              </div>
              <div style={S.field}>
                <label style={S.label}>Term (years)</label>
                <select style={S.select} value={termYears} onChange={(e) => setTermYears(e.target.value)} disabled={goalLimitReached && !editId}>
                  {[10, 15, 20, 25, 30, 35].map((y) => <option key={y} value={y}>{y} years</option>)}
                </select>
              </div>
              <div style={S.field}>
                <label style={S.label}>Interest rate (% p.a.)</label>
                <input style={S.input} type="number" min="0" step="0.1" placeholder="e.g. 8" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} disabled={goalLimitReached && !editId} />
              </div>
              {endowmentType === 'anticipated' && (
                <div style={S.field}>
                  <label style={S.label}>Payout every (years)</label>
                  <select style={S.select} value={payoutInterval} onChange={(e) => setPayoutInterval(e.target.value)} disabled={goalLimitReached && !editId}>
                    {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((y) => <option key={y} value={y}>Every {y} years</option>)}
                  </select>
                </div>
              )}
            </>
          )}

          {category === 'sacco' && (
            <div style={S.field}>
              <label style={S.label}>Held as</label>
              <div style={S.holdingRow}>
                {(['dividends', 'shares'] as SaccoHolding[]).map((h) => (
                  <button key={h} type="button" disabled={goalLimitReached && !editId}
                    onClick={() => setSaccoHolding(h)}
                    style={{ ...S.holdingBtn, ...(saccoHolding === h ? S.holdingBtnActive : {}) }}>
                    {h === 'dividends' ? 'Dividends' : 'Shares'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isInterestVehicle && (
            <div style={S.field}>
              <label style={S.label}>{category === 'sacco' ? 'Dividend rate (% p.a.)' : 'Interest rate (% p.a.)'}</label>
              <input style={S.input} type="number" min="0" step="0.1" placeholder="e.g. 10"
                value={interestRate} onChange={(e) => setInterestRate(e.target.value)} disabled={goalLimitReached && !editId} />
            </div>
          )}

          {isInterestVehicle && (
            <div style={S.field}>
              <label style={S.label}>Locked in (fixed term)?</label>
              <div style={S.holdingRow}>
                <button type="button" disabled={goalLimitReached && !editId} onClick={() => setLockedIn(true)}
                  style={{ ...S.holdingBtn, ...(lockedIn ? S.holdingBtnActive : {}) }}>
                  <Lock size={13} /> Locked
                </button>
                <button type="button" disabled={goalLimitReached && !editId} onClick={() => setLockedIn(false)}
                  style={{ ...S.holdingBtn, ...(!lockedIn ? S.holdingBtnActive : {}) }}>
                  <Unlock size={13} /> Flexible
                </button>
              </div>
            </div>
          )}

          {isInterestVehicle && lockedIn && (
            <div style={S.field}>
              <label style={S.label}>Lock duration (years)</label>
              <input style={S.input} type="number" min="0" placeholder="e.g. 2" value={lockYears} onChange={(e) => setLockYears(e.target.value)} disabled={goalLimitReached && !editId} />
            </div>
          )}

          {isChama && (
            <>
              <div style={S.field}>
                <label style={S.label}>Number of members</label>
                <input style={S.input} type="number" min="1" placeholder="e.g. 12"
                  value={chamaMembers} onChange={(e) => setChamaMembers(e.target.value)} disabled={goalLimitReached && !editId} />
              </div>
              <div style={S.field}>
                <label style={S.label}>Your payout position (1 = first)</label>
                <input style={S.input} type="number" min="1" placeholder="e.g. 5"
                  value={chamaPosition} onChange={(e) => setChamaPosition(e.target.value)} disabled={goalLimitReached && !editId} />
              </div>
              <div style={S.field}>
                <label style={S.label}>Contribution frequency</label>
                <div style={S.holdingRow}>
                  {(['daily', 'weekly', 'monthly'] as ChamaFrequency[]).map((f) => (
                    <button key={f} type="button" disabled={goalLimitReached && !editId}
                      onClick={() => setChamaFrequency(f)}
                      style={{ ...S.holdingBtn, ...(chamaFrequency === f ? S.holdingBtnActive : {}) }}>
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div style={S.field}>
                <label style={S.label}>Contribution per member ({chamaFrequency}, KSh)</label>
                <input style={S.input} type="number" min="0" placeholder="e.g. 1000"
                  value={chamaContribution} onChange={(e) => setChamaContribution(e.target.value)} disabled={goalLimitReached && !editId} />
              </div>
            </>
          )}
        </div>

        {isChama && (
          <div style={S.projectionBox}>
            <Users size={16} strokeWidth={2.2} style={{ color: 'var(--green)', flexShrink: 0 }} />
            {formChamaPlan ? (
              <span>
                Each {formChamaPlan.frequency.replace('ly', '')} round the pot is{' '}
                <strong style={{ color: 'var(--green)' }}>{formatCurrency(formChamaPlan.pot, currency)}</strong>{' '}
                ({formChamaPlan.members} × {formatCurrency(formChamaPlan.perMember, currency)}).
                {formChamaPlan.position
                  ? <> As member #{formChamaPlan.position}, you receive <strong style={{ color: 'var(--green)' }}>{formatCurrency(formChamaPlan.pot, currency)}</strong>{formChamaPlan.payoutDate ? <> around <strong style={{ color: 'var(--text-1)' }}>{formChamaPlan.payoutDate}</strong></> : ''}.</>
                  : ' Set your position to estimate when you receive it.'}
              </span>
            ) : (
              <span style={{ color: 'var(--text-3)' }}>Enter members and per-member contribution to see the pot.</span>
            )}
          </div>
        )}

        {isInterestVehicle && (
          <div style={S.projectionBox}>
            <TrendingUp size={16} strokeWidth={2.2} style={{ color: 'var(--green)', flexShrink: 0 }} />
            {formProjection ? (
              <span>
                By <strong style={{ color: 'var(--text-1)' }}>{deadline}</strong> ({formProjection.months} mo) you'd have about{' '}
                <strong style={{ color: 'var(--green)' }}>{formatCurrency(formProjection.futureValue, currency)}</strong> —
                that's <strong style={{ color: 'var(--green)' }}>{formatCurrency(formProjection.interestEarned, currency)}</strong> earned in {category === 'sacco' ? 'dividends' : 'interest'}.
              </span>
            ) : (
              <span style={{ color: 'var(--text-3)' }}>Add a rate and a deadline to see projected {category === 'sacco' ? 'dividends' : 'interest'} earned.</span>
            )}
          </div>
        )}

        {isEndowment && (() => {
          const proj = projectEndowment({
            category: 'insurance', endowmentType, termYears: parseInt(termYears) || 0,
            interestRate: parseFloat(interestRate) || 0, savedAmount: parseFloat(saved.replace(/,/g, '') || '0'),
            monthlyContribution: parseFloat(monthly.replace(/,/g, '') || '0'),
            payoutIntervalYears: parseInt(payoutInterval) || 0,
          } as Goal);
          return (
            <div style={S.projectionBox}>
              <Umbrella size={16} strokeWidth={2.2} style={{ color: 'var(--green)', flexShrink: 0 }} />
              {proj ? (
                <span>
                  Projected maturity <strong style={{ color: 'var(--green)' }}>{formatCurrency(proj.maturityValue, currency)}</strong>
                  {' '}(+{formatCurrency(proj.interestEarned, currency)} interest).
                  {proj.endowmentType === 'anticipated' && proj.totalPayouts > 1
                    ? <> ≈ <strong style={{ color: 'var(--text-1)' }}>{proj.totalPayouts}</strong> payouts of <strong style={{ color: 'var(--green)' }}>{formatCurrency(proj.perPayout, currency)}</strong> — first around <strong style={{ color: 'var(--text-1)' }}>{proj.schedule[0].date}</strong>.</>
                    : <> Paid at maturity ({proj.schedule[0].date}).</>}
                </span>
              ) : <span style={{ color: 'var(--text-3)' }}>Add a term and interest rate to project the endowment.</span>}
            </div>
          );
        })()}

        <div style={S.formBottom}>
          <input style={{ ...S.input, width: '100%', boxSizing: 'border-box' }} placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} disabled={goalLimitReached && !editId} />
          <button style={{ ...S.addBtn, width: '100%', opacity: !name.trim() || !target || (goalLimitReached && !editId) ? 0.5 : 1 }} onClick={handleSave} disabled={!name.trim() || !target || (goalLimitReached && !editId)}>
            <Check size={15} strokeWidth={2.6} /> Save {editId ? 'Changes' : 'Investment'}
          </button>
        </div>
      </Modal>

      {/* Active Goals */}
      {activeGoals.length > 0 && (
        <div>
          <div style={{ ...S.sectionTitle, display: 'inline-flex', alignItems: 'center', gap: 8 }}><Target size={18} strokeWidth={2.1} /> Active Goals ({activeGoals.length})</div>
          <div style={S.goalGrid}>
            {activeGoals.map((goal) => {
              const meta = GOAL_META[goal.category];
              const Icon = meta.icon;
              const pct  = getGoalProgress(goal);
              const status = getGoalDeadlineStatus(goal);
              const projDate = projectGoalDate(goal);
              const interestProj = projectGoalInterest(goal);
              const chamaPlan = computeChamaPlan(goal);
              // const remaining = goal.targetAmount - goal.savedAmount;

              return (
                <div key={goal.id} style={{ ...S.goalCard, borderColor: `${meta.color}25` }}>
                  <div style={S.goalHeader}>
                    <div style={{ ...S.goalIcon, background: `${meta.color}18` }}><Icon size={22} strokeWidth={2.1} style={{ color: meta.color }} /></div>
                    <div style={S.goalInfo}>
                      <div style={S.goalName}>{goal.name}</div>
                      <div style={{ ...S.goalCat, color: meta.color }}>
                        {meta.label}{goal.institution ? ` · ${goal.institution}` : ''}
                        {goal.saccoHolding ? ` · ${goal.saccoHolding === 'dividends' ? 'Dividends' : 'Shares'}` : ''}
                      </div>
                    </div>
                    <div style={S.goalBadgeWrap}>
                      {status !== 'no-deadline' && (
                        <span style={{ ...S.statusBadge,
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          color: status === 'on-track' ? 'var(--green)' : 'var(--red)',
                          background: status === 'on-track' ? 'var(--green-dim)' : 'var(--red-dim)',
                        }}>
                          {status === 'on-track'
                            ? <><Check size={12} strokeWidth={2.8} /> On Track</>
                            : <><AlertTriangle size={12} strokeWidth={2.4} /> Behind</>}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={S.goalAmounts}>
                    <div>
                      <div style={S.amtLabel}>Saved</div>
                      <div style={{ ...S.amtVal, color: meta.color }}>{formatCurrency(goal.savedAmount, currency)}</div>
                    </div>
                    <div style={S.amtDivider}>/</div>
                    <div>
                      <div style={S.amtLabel}>Target</div>
                      <div style={S.amtVal}>{formatCurrency(goal.targetAmount, currency)}</div>
                    </div>
                    <div style={S.amtPct}>{pct}%</div>
                  </div>

                  <div style={S.progressTrack}>
                    <div style={{ ...S.progressFill, width: `${pct}%`, background: `linear-gradient(90deg, ${meta.color}99, ${meta.color})` }} />
                  </div>

                  <div style={S.goalMeta}>
                    {goal.deadline && <span style={S.metaItem}><Calendar size={13} strokeWidth={2.2} /> {goal.deadline}</span>}
                    {projDate && <span style={S.metaItem}><MapPin size={13} strokeWidth={2.2} /> Est. {projDate}</span>}
                    {goal.monthlyContribution > 0 && <span style={S.metaItem}><Wallet size={13} strokeWidth={2.2} /> {formatCurrency(goal.monthlyContribution, currency)}/mo</span>}
                    {goal.interestRate ? <span style={S.metaItem}><TrendingUp size={13} strokeWidth={2.2} /> {goal.interestRate}% p.a.</span> : null}
                    {goal.lockedIn != null && !goal.lockYears ? (
                      <span style={S.metaItem}>{goal.lockedIn ? <Lock size={13} strokeWidth={2.2} /> : <Unlock size={13} strokeWidth={2.2} />} {goal.lockedIn ? 'Locked' : 'Flexible'}</span>
                    ) : null}
                    {goal.lockYears ? <span style={S.metaItem}><Lock size={13} strokeWidth={2.2} /> Locked {goal.lockYears} yrs</span> : null}
                    {goal.termYears ? <span style={S.metaItem}><Calendar size={13} strokeWidth={2.2} /> {goal.termYears}-yr term</span> : null}
                    {chamaPlan ? <span style={S.metaItem}><Users size={13} strokeWidth={2.2} /> {chamaPlan.members} members</span> : null}
                    {chamaPlan?.position ? <span style={S.metaItem}><Hash size={13} strokeWidth={2.2} /> #{chamaPlan.position}</span> : null}
                  </div>

                  {chamaPlan && (
                    <div style={{ ...S.projectionBox, margin: 0 }}>
                      <Users size={15} strokeWidth={2.2} style={{ color: 'var(--green)', flexShrink: 0 }} />
                      <span>
                        Pot <strong style={{ color: 'var(--green)' }}>{formatCurrency(chamaPlan.pot, currency)}</strong> per {chamaPlan.frequency.replace('ly', '')} round
                        {chamaPlan.position && chamaPlan.payoutDate
                          ? <> · your turn ≈ <strong style={{ color: 'var(--text-1)' }}>{chamaPlan.payoutDate}</strong></>
                          : ''}
                      </span>
                    </div>
                  )}

                  {interestProj && (
                    <div style={{ ...S.projectionBox, margin: 0 }}>
                      <TrendingUp size={15} strokeWidth={2.2} style={{ color: 'var(--green)', flexShrink: 0 }} />
                      <span>
                        Projected <strong style={{ color: 'var(--green)' }}>{formatCurrency(interestProj.futureValue, currency)}</strong> by {goal.deadline}
                        {' '}(+<strong style={{ color: 'var(--green)' }}>{formatCurrency(interestProj.interestEarned, currency)}</strong> {goal.category === 'sacco' ? 'dividends' : 'interest'})
                      </span>
                    </div>
                  )}

                  {(() => { const ep = projectEndowment(goal); return ep ? (
                    <div style={{ ...S.projectionBox, margin: 0 }}>
                      <Umbrella size={15} strokeWidth={2.2} style={{ color: 'var(--green)', flexShrink: 0 }} />
                      <span>
                        Maturity <strong style={{ color: 'var(--green)' }}>{formatCurrency(ep.maturityValue, currency)}</strong> in {ep.termYears} yrs
                        {ep.endowmentType === 'anticipated' && ep.totalPayouts > 1 ? <> · {ep.totalPayouts} payouts of <strong style={{ color: 'var(--green)' }}>{formatCurrency(ep.perPayout, currency)}</strong></> : ''}
                      </span>
                    </div>
                  ) : null; })()}

                  {/* Contribute panel */}
                  {contributeId === goal.id ? (
                    <div style={S.contributeRow}>
                      <input style={{ ...S.input, flex: 1, padding: '8px 12px', fontSize: 13 }}
                        type="number" placeholder="Amount to add..." value={contributeAmt}
                        onChange={(e) => setContributeAmt(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleContribute(goal.id)}
                        autoFocus />
                      <button style={S.confirmBtn} onClick={() => handleContribute(goal.id)}>Add</button>
                      <button style={{ ...S.cancelBtn, display: 'inline-flex', alignItems: 'center' }} onClick={() => setContributeId(null)} aria-label="Cancel"><X size={14} strokeWidth={2.4} /></button>
                    </div>
                  ) : (
                    <div style={S.goalActions}>
                      <button style={S.contributeBtn} onClick={() => setContributeId(goal.id)}>+ Contribute</button>
                      <button style={S.editBtn} onClick={() => openEdit(goal)}>Edit</button>
                      <button style={S.removeBtn} onClick={() => onRemove(goal.id)}>Remove</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <div>
          <div style={{ ...S.sectionTitle, display: 'inline-flex', alignItems: 'center', gap: 8 }}><Trophy size={18} strokeWidth={2.1} /> Completed Goals ({completedGoals.length})</div>
          <div style={S.completedList}>
            {completedGoals.map((goal) => {
              const meta = GOAL_META[goal.category];
              const Icon = meta.icon;
              return (
                <div key={goal.id} style={S.completedItem}>
                  <span style={S.completedIcon}><Icon size={22} strokeWidth={2.1} style={{ color: meta.color }} /></span>
                  <div style={S.completedInfo}>
                    <div style={S.completedName}>{goal.name}</div>
                    <div style={S.completedAmt}>{formatCurrency(goal.targetAmount, currency)}</div>
                  </div>
                  <span style={{ ...S.completedBadge, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Check size={12} strokeWidth={2.8} /> Done</span>
                  <button style={{ ...S.removeBtn, display: 'inline-flex', alignItems: 'center' }} onClick={() => onRemove(goal.id)} aria-label="Remove"><X size={14} strokeWidth={2.4} /></button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {goals.length === 0 && (
        <div style={S.emptyState}>
          <div style={S.emptyIcon}><Target size={48} strokeWidth={1.8} style={{ color: 'var(--gold)' }} /></div>
          <div style={S.emptyTitle}>Set your first financial goal</div>
          <p style={S.emptyText}>Whether it's an emergency fund, a vacation, or a down payment — every goal starts with a single step.</p>
        </div>
      )}
    </div>
  );
};

const S: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: 20 },
  cardTitle: { fontFamily: 'Cormorant Garamond, serif', fontSize: 20, fontWeight: 600, color: 'var(--text-1)', marginBottom: 16 },
  summaryBar: {},
  summaryItem: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px' },
  summaryLabel: { fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 },
  summaryVal: { fontFamily: 'Cormorant Garamond, serif', fontSize: 20, fontWeight: 700 },
  overallCard: { background: 'var(--bg-elevated)', border: '1px solid var(--border-acc)', borderRadius: 14, padding: '22px 26px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  overallLeft: { flex: 1 },
  overallRight: { flexShrink: 0 },
  overallAmt: { fontFamily: 'Cormorant Garamond, serif', fontSize: 28, fontWeight: 700, color: 'var(--gold)' },
  overallOf: { fontSize: 16, color: 'var(--text-3)' },
  formCard: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '24px 22px' },
  formTitleRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 },
  successTag: { fontSize: 12, color: 'var(--green)', background: 'var(--green-dim)', padding: '3px 10px', borderRadius: 4, fontWeight: 600 },
  limitTag: { fontSize: 12, color: 'var(--gold)', background: 'var(--gold-dim)', border: '1px solid var(--border-acc)', padding: '3px 10px', borderRadius: 999, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5 },
  lockedFormCard: { borderColor: 'var(--border-acc)', background: 'linear-gradient(135deg, var(--bg-card), var(--gold-dim))' },
  upgradePrompt: { display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', border: '1px solid var(--border-acc)', borderRadius: 12, background: 'var(--bg-surface)', marginBottom: 18, flexWrap: 'wrap' },
  upgradeIcon: { width: 38, height: 38, borderRadius: 11, display: 'grid', placeItems: 'center', color: 'var(--gold)', background: 'var(--gold-dim)', flexShrink: 0 },
  upgradeTitle: { fontSize: 14, fontWeight: 800, color: 'var(--text-1)', marginBottom: 3 },
  upgradeText: { fontSize: 12, color: 'var(--text-3)', lineHeight: 1.45 },
  upgradeBtn: { padding: '9px 14px', background: 'linear-gradient(135deg, var(--gold), var(--gold-l))', color: '#0A1628', border: 'none', borderRadius: 9, fontWeight: 800, fontSize: 12, fontFamily: 'Karla, sans-serif', cursor: 'pointer' },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' },
  input: { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', color: 'var(--text-1)', fontSize: 14, fontFamily: 'Karla, sans-serif' },
  select: { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', color: 'var(--text-1)', fontSize: 14, fontFamily: 'Karla, sans-serif' },
  holdingRow: { display: 'flex', gap: 6 },
  holdingBtn: { flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-3)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Karla, sans-serif' },
  holdingBtnActive: { background: 'var(--gold-dim)', color: 'var(--gold)', borderColor: 'var(--border-acc)' },
  projectionBox: { display: 'flex', alignItems: 'center', gap: 9, margin: '14px 0 0', padding: '11px 14px', background: 'var(--green-dim)', border: '1px solid var(--green-b)', borderRadius: 10, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 },
  formBottom: { display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 },
  addBtn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '11px 24px', background: 'linear-gradient(135deg, var(--gold), var(--gold-l))', color: '#0A1628', border: 'none', borderRadius: 9, fontWeight: 700, fontSize: 14, fontFamily: 'Karla, sans-serif', whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer' },
  addTriggerBtn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, alignSelf: 'flex-start', padding: '13px 22px', background: 'linear-gradient(135deg, var(--gold), var(--gold-l))', color: '#0A1628', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: 14, fontFamily: 'Karla, sans-serif', cursor: 'pointer', boxShadow: '0 4px 20px var(--gold-glow)' },
  modalOverlay: { position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(6,12,24,0.55)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' },
  modalCard: { position: 'relative', width: '100%', maxWidth: 560, maxHeight: 'calc(100vh - 48px)', overflowY: 'auto', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 22, boxShadow: 'var(--shadow-lg, 0 20px 60px rgba(0,0,0,0.35))' },
  modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 18 },
  modalClose: { display: 'grid', placeItems: 'center', width: 34, height: 34, background: 'transparent', border: '1px solid var(--border)', borderRadius: 9, color: 'var(--text-2)', cursor: 'pointer', flexShrink: 0 },
  sectionTitle: { fontFamily: 'Cormorant Garamond, serif', fontSize: 18, fontWeight: 600, color: 'var(--text-2)', marginBottom: 12 },
  goalGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 },
  goalCard: { background: 'var(--bg-card)', border: '1px solid', borderRadius: 14, padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 },
  goalHeader: { display: 'flex', alignItems: 'center', gap: 12 },
  goalIcon: { width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 },
  goalInfo: { flex: 1, minWidth: 0 },
  goalName: { fontSize: 15, fontWeight: 600, color: 'var(--text-1)' },
  goalCat: { fontSize: 12, marginTop: 2 },
  goalBadgeWrap: { flexShrink: 0 },
  statusBadge: { fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, letterSpacing: '0.06em' },
  goalAmounts: { display: 'flex', alignItems: 'center', gap: 12 },
  amtLabel: { fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 },
  amtVal: { fontFamily: 'Cormorant Garamond, serif', fontSize: 18, fontWeight: 700, color: 'var(--text-1)' },
  amtDivider: { color: 'var(--text-3)', fontSize: 20, alignSelf: 'flex-end', paddingBottom: 2 },
  amtPct: { marginLeft: 'auto', fontFamily: 'Cormorant Garamond, serif', fontSize: 28, fontWeight: 700, color: 'var(--text-3)' },
  progressTrack: { height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3, transition: 'width 0.6s ease' },
  goalMeta: { display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-3)', flexWrap: 'wrap' },
  metaItem: { display: 'inline-flex', alignItems: 'center', gap: 4 },
  contributeRow: { display: 'flex', gap: 8, alignItems: 'center' },
  confirmBtn: { padding: '8px 16px', background: 'linear-gradient(135deg, var(--gold), var(--gold-l))', color: '#0A1628', borderRadius: 7, fontWeight: 700, fontSize: 13 },
  cancelBtn: { padding: '8px 10px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-3)', borderRadius: 7, fontSize: 13 },
  goalActions: { display: 'flex', gap: 8 },
  contributeBtn: { flex: 1, padding: '9px 0', background: 'var(--gold-dim)', border: '1px solid var(--border-acc)', color: 'var(--gold)', borderRadius: 8, fontWeight: 600, fontSize: 13 },
  editBtn: { padding: '9px 14px', background: 'transparent', border: '1px solid var(--border-acc)', color: 'var(--gold)', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: 'Karla, sans-serif' },
  removeBtn: { padding: '9px 14px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-3)', borderRadius: 8, fontSize: 13 },
  completedList: { display: 'flex', flexDirection: 'column', gap: 8 },
  completedItem: { display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'var(--green-dim)', border: '1px solid var(--green-b)', borderRadius: 10 },
  completedIcon: { fontSize: 22, flexShrink: 0 },
  completedInfo: { flex: 1 },
  completedName: { fontSize: 14, color: 'var(--text-1)', fontWeight: 500 },
  completedAmt: { fontSize: 12, color: 'var(--text-3)', marginTop: 2 },
  completedBadge: { fontSize: 11, color: 'var(--green)', background: 'var(--green-dim)', padding: '3px 10px', borderRadius: 20, fontWeight: 700 },
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 24px', background: 'var(--bg-card)', border: '1px dashed var(--border-acc)', borderRadius: 14, textAlign: 'center' },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontFamily: 'Cormorant Garamond, serif', fontSize: 24, fontWeight: 600, color: 'var(--gold)', marginBottom: 10 },
  emptyText: { fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7, maxWidth: 400 },
};
