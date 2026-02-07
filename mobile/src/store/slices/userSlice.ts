import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { UserSupportProfile } from '@/types/user';
import { userService } from '@/services/userService';

interface UserState {
    profile: UserSupportProfile | null;
    isLoading: boolean;
    error: string | null;
}

const initialState: UserState = {
    profile: null,
    isLoading: false,
    error: null,
};

export const fetchUserProfile = createAsyncThunk(
    'user/fetchProfile',
    async (userId: string, { rejectWithValue }) => {
        try {
            const profile = await userService.getProfile(userId);
            return profile;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to fetch profile');
        }
    }
);

export const updateUserProfile = createAsyncThunk(
    'user/updateProfile',
    async (profile: Partial<UserSupportProfile>, { rejectWithValue }) => {
        try {
            const updatedProfile = await userService.updateProfile(profile);
            return updatedProfile;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to update profile');
        }
    }
);

export const createUserProfile = createAsyncThunk(
    'user/createProfile',
    async (profileData: Omit<UserSupportProfile, 'createdAt' | 'updatedAt'>, { rejectWithValue }) => {
        try {
            const profile = await userService.createProfile(profileData);
            return profile;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to create profile');
        }
    }
);

const userSlice = createSlice({
    name: 'user',
    initialState,
    reducers: {
        clearUserError: (state) => {
            state.error = null;
        },
        clearUserProfile: (state) => {
            state.profile = null;
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetch profile cases
            .addCase(fetchUserProfile.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchUserProfile.fulfilled, (state, action) => {
                state.isLoading = false;
                state.profile = action.payload;
                state.error = null;
            })
            .addCase(fetchUserProfile.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            // Update profile cases
            .addCase(updateUserProfile.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(updateUserProfile.fulfilled, (state, action) => {
                state.isLoading = false;
                state.profile = action.payload;
                state.error = null;
            })
            .addCase(updateUserProfile.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            // Create profile cases
            .addCase(createUserProfile.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(createUserProfile.fulfilled, (state, action) => {
                state.isLoading = false;
                state.profile = action.payload;
                state.error = null;
            })
            .addCase(createUserProfile.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            });
    },
});

export const { clearUserError, clearUserProfile } = userSlice.actions;
export default userSlice.reducer;