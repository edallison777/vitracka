import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { WeightEntry } from '@/types/user';
import { weightService } from '@/services/weightService';

interface WeightState {
    entries: WeightEntry[];
    isLoading: boolean;
    error: string | null;
}

const initialState: WeightState = {
    entries: [],
    isLoading: false,
    error: null,
};

export const fetchWeightEntries = createAsyncThunk(
    'weight/fetchEntries',
    async (userId: string, { rejectWithValue }) => {
        try {
            const entries = await weightService.getEntries(userId);
            return entries;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to fetch weight entries');
        }
    }
);

export const addWeightEntry = createAsyncThunk(
    'weight/addEntry',
    async (entry: Omit<WeightEntry, 'id' | 'timestamp'>, { rejectWithValue }) => {
        try {
            const newEntry = await weightService.addEntry(entry);
            return newEntry;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to add weight entry');
        }
    }
);

export const updateWeightEntry = createAsyncThunk(
    'weight/updateEntry',
    async (entry: WeightEntry, { rejectWithValue }) => {
        try {
            const updatedEntry = await weightService.updateEntry(entry);
            return updatedEntry;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to update weight entry');
        }
    }
);

const weightSlice = createSlice({
    name: 'weight',
    initialState,
    reducers: {
        clearWeightError: (state) => {
            state.error = null;
        },
        clearWeightEntries: (state) => {
            state.entries = [];
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetch entries cases
            .addCase(fetchWeightEntries.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchWeightEntries.fulfilled, (state, action) => {
                state.isLoading = false;
                state.entries = action.payload;
                state.error = null;
            })
            .addCase(fetchWeightEntries.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            // Add entry cases
            .addCase(addWeightEntry.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(addWeightEntry.fulfilled, (state, action) => {
                state.isLoading = false;
                state.entries.unshift(action.payload);
                state.error = null;
            })
            .addCase(addWeightEntry.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            // Update entry cases
            .addCase(updateWeightEntry.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(updateWeightEntry.fulfilled, (state, action) => {
                state.isLoading = false;
                const index = state.entries.findIndex(entry => entry.id === action.payload.id);
                if (index !== -1) {
                    state.entries[index] = action.payload;
                }
                state.error = null;
            })
            .addCase(updateWeightEntry.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            });
    },
});

export const { clearWeightError, clearWeightEntries } = weightSlice.actions;
export default weightSlice.reducer;