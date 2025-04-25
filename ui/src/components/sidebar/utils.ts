// Utility functions for sidebar components

/**
 * Helper function to format avatar URL
 * 
 * @param avatarPath - Path to the avatar image
 * @param timestamp - Optional timestamp for cache busting
 * @returns Properly formatted avatar URL
 */
export const formatAvatarUrl = (avatarPath: string, timestamp?: number): string => {
  // If it's null or undefined, return default avatar
  if (!avatarPath) {
    return '/images/avatar.jpg';
  }
  
  // If it's a full URL (starts with http)
  if (avatarPath.startsWith('http')) {
    return timestamp ? `${avatarPath}?t=${timestamp}` : avatarPath;
  }
  
  // If it already has a leading slash
  if (avatarPath.startsWith('/')) {
    return timestamp ? `${avatarPath}?t=${timestamp}` : avatarPath;
  }
  
  // If it starts with "images/" but no leading slash
  if (avatarPath.startsWith('images/')) {
    return timestamp ? `/${avatarPath}?t=${timestamp}` : `/${avatarPath}`;
  }
  
  // For any other format, assume it's a relative path and add the /images/ prefix
  return timestamp ? `/images/${avatarPath}?t=${timestamp}` : `/images/${avatarPath}`;
}; 