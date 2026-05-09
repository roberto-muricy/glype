import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { hapticMedium } from '@/src/utils/haptics';
import {
  getFeed,
  followUser,
  unfollowUser,
  isFollowing,
  getFollowCounts,
  getFollowers,
  getFollowing,
  getSuggestedUsers,
  searchProfiles,
} from '@/src/services/feed.service';

export const feedKeys = {
  feed: ['feed'] as const,
  following: (targetId: string) => ['feed', 'following', targetId] as const,
  followCounts: (userId: string) => ['feed', 'counts', userId] as const,
  followers: (userId: string) => ['feed', 'followers', userId] as const,
  followingList: (userId: string) => ['feed', 'followingList', userId] as const,
  suggestedUsers: ['feed', 'suggested'] as const,
  profileSearch: (query: string) => ['feed', 'profileSearch', query] as const,
};

export function useFeed(limit = 20) {
  return useQuery({
    queryKey: feedKeys.feed,
    queryFn: () => getFeed(limit),
    staleTime: 1000 * 60 * 2, // 2min
  });
}

export function useIsFollowing(targetId: string | null) {
  return useQuery({
    queryKey: feedKeys.following(targetId ?? ''),
    queryFn: () => isFollowing(targetId!),
    enabled: !!targetId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useFollowCounts(userId: string | null) {
  return useQuery({
    queryKey: feedKeys.followCounts(userId ?? ''),
    queryFn: () => getFollowCounts(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useFollowUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (targetId: string) => followUser(targetId),
    onMutate: () => hapticMedium(),
    onSuccess: (_, targetId) => {
      queryClient.invalidateQueries({ queryKey: feedKeys.following(targetId) });
      queryClient.invalidateQueries({ queryKey: feedKeys.feed });
      queryClient.invalidateQueries({ queryKey: feedKeys.followCounts(targetId) });
    },
  });
}

export function useUnfollowUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (targetId: string) => unfollowUser(targetId),
    onMutate: () => hapticMedium(),
    onSuccess: (_, targetId) => {
      queryClient.invalidateQueries({ queryKey: feedKeys.following(targetId) });
      queryClient.invalidateQueries({ queryKey: feedKeys.feed });
      queryClient.invalidateQueries({ queryKey: feedKeys.followCounts(targetId) });
    },
  });
}

export function useFollowers(userId: string | null) {
  return useQuery({
    queryKey: feedKeys.followers(userId ?? ''),
    queryFn: () => getFollowers(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useFollowingList(userId: string | null) {
  return useQuery({
    queryKey: feedKeys.followingList(userId ?? ''),
    queryFn: () => getFollowing(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useSuggestedUsers() {
  return useQuery({
    queryKey: feedKeys.suggestedUsers,
    queryFn: () => getSuggestedUsers(12),
    staleTime: 1000 * 60 * 10,
  });
}

export function useProfileSearch(query: string) {
  return useQuery({
    queryKey: feedKeys.profileSearch(query),
    queryFn: () => searchProfiles(query),
    enabled: query.trim().length >= 2,
    staleTime: 1000 * 60,
  });
}
