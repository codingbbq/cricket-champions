import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';

interface Comment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: any;
}

interface CommentsSectionProps {
  matchId: string;
  onCommentAdded?: () => void;
}

const CommentsSection = ({ matchId, onCommentAdded }: CommentsSectionProps) => {
  const { currentUser } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComments();
  }, [matchId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const commentsRef = collection(db, `matches/${matchId}/comments`);
      const commentsQuery = query(commentsRef, orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(commentsQuery);
      const commentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Comment[];
      
      setComments(commentsData);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    const text = commentText.trim();
    if (!text || !currentUser) return;
    
    setIsSubmitting(true);
    
    try {
      const commentsRef = collection(db, `matches/${matchId}/comments`);
      const newComment = {
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Anonymous',
        text,
        timestamp: serverTimestamp(),
      };
      
      await addDoc(commentsRef, newComment);
      
      setCommentText('');
      await fetchComments();
      
      if (onCommentAdded) {
        onCommentAdded();
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="border-t border-neutral-800 pt-3">
      <div className="text-xs uppercase tracking-wider text-neutral-600 mb-3">Comments</div>
      
      {/* Comment Input */}
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !isSubmitting) {
              handleAddComment();
            }
          }}
          placeholder="Add a comment..."
          className="flex-1 px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
        />
        <button
          onClick={handleAddComment}
          disabled={!commentText.trim() || isSubmitting}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {isSubmitting ? '...' : 'Post'}
        </button>
      </div>

      {/* Comments List */}
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {loading ? (
          <div className="text-xs text-neutral-600 text-center py-4">Loading comments...</div>
        ) : comments.length > 0 ? (
          comments.map((comment) => (
            <div key={comment.id} className="bg-neutral-800/50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-amber-400">{comment.userName}</span>
                <span className="text-xs text-neutral-600">
                  {comment.timestamp?.toDate ? new Date(comment.timestamp.toDate()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                </span>
              </div>
              <p className="text-sm text-neutral-300">{comment.text}</p>
            </div>
          ))
        ) : (
          <div className="text-xs text-neutral-600 text-center py-4">No comments yet. Be the first to comment!</div>
        )}
      </div>
    </div>
  );
};

export default CommentsSection;
