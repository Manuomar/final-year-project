import React, { useEffect, useState } from 'react';
import { MapPin, Star, UserX } from 'lucide-react';
import axios from 'axios';

interface Skill {
  name: string;
  level: string;
}

interface Availability {
  weekdays: boolean;
  weekends: boolean;
  evenings: boolean;
  mornings: boolean;
}

interface BlockedUser {
  _id: string;
  name: string;
  location?: string;
  skillsOffered: Skill[];
  skillsWanted: Skill[];
  rating: { average: number; count: number };
  availability: Availability;
}

const BlockedUsers: React.FC = () => {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchBlockedUsers();
  }, []);

  const fetchBlockedUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/users/blocked');
      setBlockedUsers(response.data.users || []);
    } catch (error) {
      console.error('Error fetching blocked users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveBlock = async (targetUser: BlockedUser) => {
    const shouldUnblock = window.confirm(`Remove block for ${targetUser.name}?`);
    if (!shouldUnblock) return;

    try {
      setProcessingUserId(targetUser._id);
      await axios.delete(`/api/users/${targetUser._id}/block`);
      setBlockedUsers((previousBlockedUsers) =>
        previousBlockedUsers.filter((blockedUser) => blockedUser._id !== targetUser._id)
      );
      alert(`${targetUser.name} has been unblocked.`);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to remove block');
    } finally {
      setProcessingUserId(null);
    }
  };

  const getAvailabilityText = (availability: Availability) => {
    const times = [];
    if (availability.mornings) times.push('Mornings');
    if (availability.evenings) times.push('Evenings');
    if (availability.weekdays) times.push('Weekdays');
    if (availability.weekends) times.push('Weekends');
    return times.length ? times.join(', ') : 'Not specified';
  };

  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'beginner':
        return 'bg-green-100 text-green-800';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800';
      case 'advanced':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Blocked Users</h1>
        <p className="text-gray-600">Users you blocked are listed here. Use Remove Block to unblock them.</p>
      </div>

      {blockedUsers.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-600">
          No blocked users.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {blockedUsers.map((blockedUser) => (
            <div key={blockedUser._id} className="bg-white rounded-lg shadow-md p-6 border border-red-100">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{blockedUser.name}</h3>
                  {blockedUser.location && (
                    <div className="flex items-center text-sm text-gray-600 mt-1">
                      <MapPin className="h-4 w-4 mr-1" />
                      {blockedUser.location}
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-1">
                  <Star className="h-4 w-4 text-yellow-400 fill-current" />
                  <span className="text-sm text-gray-600">
                    {blockedUser.rating.average || 'New'}
                    {blockedUser.rating.count > 0 && ` (${blockedUser.rating.count})`}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Skills Offered</h4>
                  <div className="flex flex-wrap gap-2">
                    {blockedUser.skillsOffered.slice(0, 3).map((skill, index) => (
                      <span
                        key={index}
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(skill.level)}`}
                      >
                        {skill.name}
                      </span>
                    ))}
                    {blockedUser.skillsOffered.length > 3 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                        +{blockedUser.skillsOffered.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Skills Wanted</h4>
                  <div className="flex flex-wrap gap-2">
                    {blockedUser.skillsWanted.slice(0, 3).map((skill, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-teal-100 text-teal-800 text-xs rounded-full font-medium"
                      >
                        {skill.name}
                      </span>
                    ))}
                    {blockedUser.skillsWanted.length > 3 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                        +{blockedUser.skillsWanted.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Availability</h4>
                  <p className="text-xs text-gray-600">{getAvailabilityText(blockedUser.availability)}</p>
                </div>
              </div>

              <div className="mt-4">
                <button
                  onClick={() => handleRemoveBlock(blockedUser)}
                  disabled={processingUserId === blockedUser._id}
                  className="w-full border border-red-200 text-red-700 px-4 py-2 rounded-lg hover:bg-red-50 disabled:text-gray-500 disabled:border-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                >
                  <UserX className="h-4 w-4" />
                  <span>{processingUserId === blockedUser._id ? 'Processing...' : 'Remove Block'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BlockedUsers;
