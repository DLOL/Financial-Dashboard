import { configureStore, createSlice, current, PayloadAction } from "@reduxjs/toolkit";
import { StreamStatus, Transaction, TransactionsState } from "./transactionTypes";

const MAX_TRANSACTIONS = 10000;

const initialState: TransactionsState = {
  list: [],
  streamStatus: "connecting",
  totalCount: 0,
};

const transactionSlice = createSlice({
  name: "transactions",
  initialState,
  reducers: {
    flushBuffer: (state, action: PayloadAction<Transaction[]>) => {
      const incoming = action.payload;
      const existingList = current(state.list);
      const merged = incoming.concat(existingList);
      state.list = merged.slice(0, MAX_TRANSACTIONS);
      state.totalCount += incoming.length;
    },
    setStreamStatus: (state, action: PayloadAction<StreamStatus>) => {
      state.streamStatus = action.payload;
    },
  },
});

export const { flushBuffer, setStreamStatus } = transactionSlice.actions;

export const store = configureStore({
  reducer: {
    transactions: transactionSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
