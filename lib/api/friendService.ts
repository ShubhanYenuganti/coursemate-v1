import { apiService, ApiResponse } from './apiService';
import { AxiosResponse } from 'axios';

export interface Friend {
    id: string;
    name: string;
    email: string;
}

export interface PendingRequest {
    request_id: string;
    requester_id: string;
    requester_name: string;
    requester_email: string;
    sent_at: string;
}

export interface UserSummary {
    id: string;
    name: string;
    email: string;
}

const sendFriendRequest = (receiverId: string) => {
    return apiService.post('/friends/request', { receiver_id: receiverId });
};

const respondToFriendRequest = (requestId: string, action: 'accept' | 'reject') => {
    return apiService.post('/friends/respond', { request_id: requestId, action });
};

const getFriends = (): Promise<Friend[]> => {
    return apiService.get('/friends/list').then((res: AxiosResponse<ApiResponse & { friends: Friend[] }>) => res.data.friends);
};

const getPendingRequests = (): Promise<PendingRequest[]> => {
    return apiService.get('/friends/pending').then((res: AxiosResponse<ApiResponse & { pending_requests: PendingRequest[] }>) => res.data.pending_requests);
};

const findNewFriends = (): Promise<UserSummary[]> => {
    return apiService.get('/friends/find').then((res: AxiosResponse<ApiResponse & { users: UserSummary[] }>) => res.data.users);
};

const getFriendsForNewChat = (): Promise<Friend[]> => {
    return apiService.get('/friends/list-for-new-chat').then((res: AxiosResponse<ApiResponse & { friends: Friend[] }>) => res.data.friends);
};

export const friendService = {
    sendFriendRequest,
    respondToFriendRequest,
    getFriends,
    getPendingRequests,
    findNewFriends,
    getFriendsForNewChat,
}; 