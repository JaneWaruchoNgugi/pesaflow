import { useState, useCallback, useEffect } from 'react';
import type { AlertContact, AlertLog } from '../types';
import { generateId } from '../utils/expenses';
import { syncDoc, fetchDoc } from '../lib/sync';

const CONTACT_KEY = 'finwise_alert_contact';
const LOG_KEY     = 'finwise_alert_log';

const DEFAULT_CONTACT: AlertContact = { name: '', email: '', whatsapp: '', phone: '' };

const loadContact = (): AlertContact => {
  try { return JSON.parse(localStorage.getItem(CONTACT_KEY) || 'null') ?? DEFAULT_CONTACT; }
  catch { return DEFAULT_CONTACT; }
};

const loadLog = (): AlertLog[] => {
  try { return JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); }
  catch { return []; }
};

export const useAlerts = () => {
  const [contact, setContactState] = useState<AlertContact>(loadContact);
  const [log, setLog]              = useState<AlertLog[]>(loadLog);

  // Hydrate the SOS contact + alert history from Firestore on mount.
  useEffect(() => {
    let alive = true;
    fetchDoc<AlertContact>('alertContact').then(remote => {
      if (alive && remote) { setContactState(remote); localStorage.setItem(CONTACT_KEY, JSON.stringify(remote)); }
    });
    fetchDoc<{ items: AlertLog[] }>('alertLog').then(remote => {
      if (alive && remote?.items) { setLog(remote.items); localStorage.setItem(LOG_KEY, JSON.stringify(remote.items)); }
    });
    return () => { alive = false; };
  }, []);

  const saveContact = useCallback((updated: AlertContact) => {
    setContactState(updated);
    localStorage.setItem(CONTACT_KEY, JSON.stringify(updated));
    syncDoc('alertContact', updated);
  }, []);

  const recordAlert = useCallback((channel: AlertLog['channel'], snapshot: string) => {
    const entry: AlertLog = {
      id: generateId(),
      channel,
      timestamp: new Date().toISOString(),
      snapshot,
    };
    const updated = [entry, ...log].slice(0, 30);
    setLog(updated);
    localStorage.setItem(LOG_KEY, JSON.stringify(updated));
    syncDoc('alertLog', { items: updated });
  }, [log]);

  const clearLog = useCallback(() => {
    setLog([]);
    localStorage.removeItem(LOG_KEY);
    syncDoc('alertLog', { items: [] });
  }, []);

  const hasContact = !!(contact.email || contact.whatsapp || contact.phone);

  return { contact, saveContact, log, recordAlert, clearLog, hasContact };
};
