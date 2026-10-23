'use client'

import { createContext, useContext } from 'react'
import { TRADE_NAME, TRADE_PHONE, TRADE_PHONE_TEL } from '@/lib/trade'

/**
 * Who the customer's page says is coming.
 *
 * The real page reads the trade from the environment, and that is still the
 * default here: nothing wrapped in this provider behaves any differently. It
 * exists for the one page that must NOT name the real trade: /demo (and the
 * /preview fixture it is drawn from) says everything on it is invented, and
 * until v1.71.1 it then showed the real business's name and a Call button
 * that rang the real business. Preview wraps itself in this with an invented
 * trade and no phone, so the demo is what it says it is.
 */
const TradeContext = createContext({ name: TRADE_NAME, phone: TRADE_PHONE, tel: TRADE_PHONE_TEL })

export function TradeProvider({ name, phone = null, tel = null, children }) {
  return <TradeContext.Provider value={{ name, phone, tel }}>{children}</TradeContext.Provider>
}

export const useTrade = () => useContext(TradeContext)
