import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../lib/firebase';
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  arrayUnion, 
  arrayRemove, 
  increment 
} from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { PrayerRequest, PrayerCategory, PrayerEncouragement } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { SearchInput } from '../ui/SearchInput';
import { formatDateReadable, formatTime12Hour } from '../../lib/utils';
import { staleWhileRevalidate, invalidateCache } from '../../lib/cache';
import { 
  Heart, 
  MessageCircle, 
  Plus, 
  Shield, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  Send, 
  Share2, 
  Trash2, 
  Filter, 
  EyeOff, 
  Flame, 
  BookOpen, 
  Trophy, 
  AlertCircle 
} from 'lucide-react';

const CATEGORIES: PrayerCategory[] = [
  'Healing & Health',
  'Spiritual Growth',
  'Family & Marriage',
  'Financial Breakthrough',
  'Career & Academics',
  'Fruit of the Womb',
  'Protection & Deliverance',
  'Thanksgiving & Praise',
  'Other Needs'
];

const SCRIPTURE_PROMPTS = [
  'Jeremiah 29:11',
  'Isaiah 53:5',
  'Philippians 4:19',
  'Psalm 91:1-4',
  'Matthew 18:19',
  'Hebrews 11:1'
];

export const PrayerWallView: React.FC = () => {
  const { member, firebaseUser, role } = useAuth();
  const isAdmin = role === 'admin' || role === 'super_admin';
  const currentUserId = firebaseUser?.uid || member?.id || 'guest';
  const currentUserName = member?.fullName || firebaseUser?.displayName || 'Fellow Believer';

  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'answered' | 'my' | 'confidential'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // New Request Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<PrayerCategory>('Healing & Health');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isConfidentialToPastors, setIsConfidentialToPastors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');

  // Answered Testimony Modal state
  const [testimonyModalPrayer, setTestimonyModalPrayer] = useState<PrayerRequest | null>(null);
  const [testimonyText, setTestimonyText] = useState('');
  const [submittingTestimony, setSubmittingTestimony] = useState(false);

  // Encouragement drawer state (active prayer ID showing encouragement form)
  const [expandedEncouragementId, setExpandedEncouragementId] = useState<string | null>(null);
  const [encouragementNote, setEncouragementNote] = useState('');
  const [sendingNote, setSendingNote] = useState(false);

  // Feedback banner
  const [bannerMessage, setBannerMessage] = useState('');

  const fetchPrayers = async () => {
    try {
      await staleWhileRevalidate('prayer_wall_requests', async () => {
        const snap = await getDocs(collection(db, 'prayer_requests'));
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as PrayerRequest));
        list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        return list;
      }, (data, fromCache) => {
        setPrayers(data);
        if (fromCache) setLoading(false);
      });
    } catch (err) {
      console.error('Error fetching prayer requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrayers();
  }, []);

  const showBanner = (msg: string) => {
    setBannerMessage(msg);
    setTimeout(() => setBannerMessage(''), 4500);
  };

  // Toggle "I Prayed for This" intercession
  const handleTogglePray = async (prayer: PrayerRequest) => {
    if (!firebaseUser?.uid && !member?.id) {
      showBanner('Please sign in to join in prayer.');
      return;
    }

    const hasPrayed = prayer.prayedUserIds?.includes(currentUserId);
    const prayerRef = doc(db, 'prayer_requests', prayer.id);

    // Optimistic UI update
    setPrayers(prev => prev.map(p => {
      if (p.id !== prayer.id) return p;
      const updatedUserIds = hasPrayed
        ? (p.prayedUserIds || []).filter(id => id !== currentUserId)
        : [...(p.prayedUserIds || []), currentUserId];
      return {
        ...p,
        prayCount: Math.max(0, (p.prayCount || 0) + (hasPrayed ? -1 : 1)),
        prayedUserIds: updatedUserIds
      };
    }));

    try {
      if (hasPrayed) {
        await updateDoc(prayerRef, {
          prayCount: increment(-1),
          prayedUserIds: arrayRemove(currentUserId)
        });
      } else {
        await updateDoc(prayerRef, {
          prayCount: increment(1),
          prayedUserIds: arrayUnion(currentUserId)
        });
        showBanner(`Amen! You joined in prayer for "${prayer.title}".`);
      }
      invalidateCache('prayer_wall_requests');
    } catch (e) {
      console.error('Failed to update prayer count:', e);
      // Revert if error
      fetchPrayers();
    }
  };

  // Submit New Prayer Request
  const handleCreatePrayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setCreateError('Please provide both a prayer title and details.');
      return;
    }

    setSubmitting(true);
    setCreateError('');
    try {
      const id = `prayer-${Date.now()}`;
      const now = new Date().toISOString();

      const newRequest: PrayerRequest = {
        id,
        title: title.trim(),
        description: description.trim(),
        category,
        authorId: currentUserId,
        authorName: isAnonymous ? 'Anonymous Believer' : currentUserName,
        authorMemberNumber: isAnonymous ? undefined : member?.membershipNumber,
        isAnonymous,
        isConfidentialToPastors,
        status: 'active',
        prayCount: 1, // Author counts as initial prayer
        prayedUserIds: [currentUserId],
        encouragements: [],
        createdAt: now,
        updatedAt: now
      };

      await setDoc(doc(db, 'prayer_requests', id), newRequest);
      setPrayers(prev => [newRequest, ...prev]);
      invalidateCache('prayer_wall_requests');

      setIsCreateModalOpen(false);
      setTitle('');
      setDescription('');
      setIsAnonymous(false);
      setIsConfidentialToPastors(false);
      showBanner('Your prayer request has been lifted to the congregation wall. God hears you!');
    } catch (err: any) {
      console.error('Error creating prayer request:', err);
      setCreateError(err.message || 'Failed to submit prayer request.');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Answered Testimony
  const handleMarkAsAnswered = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testimonyModalPrayer) return;

    setSubmittingTestimony(true);
    try {
      const now = new Date().toISOString();
      await updateDoc(doc(db, 'prayer_requests', testimonyModalPrayer.id), {
        status: 'answered',
        testimony: testimonyText.trim() || 'God supernaturally answered this prayer! To Him be all the glory.',
        answeredAt: now,
        updatedAt: now
      });

      setPrayers(prev => prev.map(p => {
        if (p.id !== testimonyModalPrayer.id) return p;
        return {
          ...p,
          status: 'answered',
          testimony: testimonyText.trim() || 'God supernaturally answered this prayer! To Him be all the glory.',
          answeredAt: now
        };
      }));

      invalidateCache('prayer_wall_requests');
      setTestimonyModalPrayer(null);
      setTestimonyText('');
      showBanner('Hallelujah! Praise God for answering your prayer.');
    } catch (err) {
      console.error('Error recording answered prayer:', err);
    } finally {
      setSubmittingTestimony(false);
    }
  };

  // Send Word of Encouragement
  const handleSendEncouragement = async (prayerId: string) => {
    if (!encouragementNote.trim()) return;

    setSendingNote(true);
    try {
      const newEncouragement: PrayerEncouragement = {
        id: `enc-${Date.now()}`,
        authorId: currentUserId,
        authorName: currentUserName,
        authorRole: role,
        message: encouragementNote.trim(),
        createdAt: new Date().toISOString()
      };

      await updateDoc(doc(db, 'prayer_requests', prayerId), {
        encouragements: arrayUnion(newEncouragement)
      });

      setPrayers(prev => prev.map(p => {
        if (p.id !== prayerId) return p;
        return {
          ...p,
          encouragements: [...(p.encouragements || []), newEncouragement]
        };
      }));

      invalidateCache('prayer_wall_requests');
      setEncouragementNote('');
      showBanner('Your word of encouragement has been shared.');
    } catch (err) {
      console.error('Failed to post encouragement:', err);
    } finally {
      setSendingNote(false);
    }
  };

  // Delete Prayer Request (Author or Admin)
  const handleDeletePrayer = async (prayerId: string) => {
    if (!window.confirm('Are you sure you want to delete this prayer request?')) return;
    try {
      await deleteDoc(doc(db, 'prayer_requests', prayerId));
      setPrayers(prev => prev.filter(p => p.id !== prayerId));
      invalidateCache('prayer_wall_requests');
      showBanner('Prayer request removed.');
    } catch (err) {
      console.error('Error deleting prayer request:', err);
    }
  };

  // Filtered Prayers
  const filteredPrayers = useMemo(() => {
    return prayers.filter(p => {
      // 1. Confidentiality Check
      if (p.isConfidentialToPastors && !isAdmin && p.authorId !== currentUserId) {
        return false;
      }

      // 2. Active Tab filter
      if (activeTab === 'active' && p.status !== 'active') return false;
      if (activeTab === 'answered' && p.status !== 'answered') return false;
      if (activeTab === 'my' && p.authorId !== currentUserId) return false;
      if (activeTab === 'confidential' && !p.isConfidentialToPastors) return false;

      // 3. Category filter
      if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;

      // 4. Search keyword
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesTitle = p.title.toLowerCase().includes(q);
        const matchesDesc = p.description.toLowerCase().includes(q);
        const matchesCategory = p.category.toLowerCase().includes(q);
        const matchesAuthor = p.authorName.toLowerCase().includes(q);
        const matchesTestimony = p.testimony?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesCategory && !matchesAuthor && !matchesTestimony) {
          return false;
        }
      }

      return true;
    });
  }, [prayers, activeTab, selectedCategory, searchTerm, isAdmin, currentUserId]);

  // Aggregate Stats
  const stats = useMemo(() => {
    const totalNeeds = prayers.filter(p => p.status === 'active').length;
    const totalAnswered = prayers.filter(p => p.status === 'answered').length;
    const totalIntercessions = prayers.reduce((acc, p) => acc + (p.prayCount || 0), 0);
    const confidentialCount = prayers.filter(p => p.isConfidentialToPastors).length;
    return { totalNeeds, totalAnswered, totalIntercessions, confidentialCount };
  }, [prayers]);

  return (
    <div className="space-y-6 pb-16 w-full max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Prayer Wall</h1>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-600" />
              Intercession Hub
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            "Bear ye one another's burdens, and so fulfil the law of Christ" — Galatians 6:2
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setIsCreateModalOpen(true)}
          className="shadow-sm"
        >
          Post Prayer Request
        </Button>
      </div>

      {/* Success Notification Banner */}
      {bannerMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{bannerMessage}</span>
        </div>
      )}

      {/* Spiritual KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 bg-white border-slate-200/80">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Active Petitions</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-slate-900">{stats.totalNeeds}</span>
            <span className="text-xs text-emerald-600 font-semibold">In Faith</span>
          </div>
        </Card>

        <Card className="p-4 bg-white border-slate-200/80">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Saints Interceding</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-emerald-700">{stats.totalIntercessions}</span>
            <span className="text-xs text-slate-400 font-medium">Prayers lifted</span>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200/80">
          <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block flex items-center gap-1">
            <Trophy className="w-3.5 h-3.5 text-amber-600" />
            Answered Prayers
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-amber-900">{stats.totalAnswered}</span>
            <span className="text-xs text-amber-700 font-semibold">Testimonies</span>
          </div>
        </Card>

        {isAdmin ? (
          <Card className="p-4 bg-slate-900 text-white border-slate-800">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              Pastoral Requests
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-white">{stats.confidentialCount}</span>
              <span className="text-xs text-emerald-400 font-semibold">Confidential</span>
            </div>
          </Card>
        ) : (
          <Card className="p-4 bg-white border-slate-200/80">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Congregation Unity</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-indigo-700">100%</span>
              <span className="text-xs text-slate-400 font-medium">Agreement</span>
            </div>
          </Card>
        )}
      </div>

      {/* Filter Tabs & Search Controls */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Main Status Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-2xl overflow-x-auto text-xs font-semibold">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-xl transition-all shrink-0 ${
                activeTab === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              All Petitions ({prayers.length})
            </button>
            <button
              onClick={() => setActiveTab('active')}
              className={`px-3 py-1.5 rounded-xl transition-all shrink-0 ${
                activeTab === 'active' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Needs Prayer ({stats.totalNeeds})
            </button>
            <button
              onClick={() => setActiveTab('answered')}
              className={`px-3 py-1.5 rounded-xl transition-all shrink-0 flex items-center gap-1 ${
                activeTab === 'answered' ? 'bg-white text-amber-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Trophy className="w-3 h-3 text-amber-500" />
              Answered & Praise ({stats.totalAnswered})
            </button>
            <button
              onClick={() => setActiveTab('my')}
              className={`px-3 py-1.5 rounded-xl transition-all shrink-0 ${
                activeTab === 'my' ? 'bg-white text-indigo-800 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              My Petitions
            </button>
            {isAdmin && (
              <button
                onClick={() => setActiveTab('confidential')}
                className={`px-3 py-1.5 rounded-xl transition-all shrink-0 flex items-center gap-1 ${
                  activeTab === 'confidential' ? 'bg-white text-rose-800 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Shield className="w-3 h-3 text-rose-500" />
                Pastoral ({stats.confidentialCount})
              </button>
            )}
          </div>

          {/* Search Input */}
          <div className="w-full md:w-72">
            <SearchInput
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClear={() => setSearchTerm('')}
              placeholder="Search petitions, scriptures..."
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-2.5 py-1 rounded-xl font-medium border transition-all shrink-0 ${
              selectedCategory === 'all'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            }`}
          >
            All Categories
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-xl font-medium border transition-all shrink-0 ${
                selectedCategory === cat
                  ? 'bg-emerald-700 text-white border-emerald-700'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Prayers List */}
      <div className="space-y-4">
        {filteredPrayers.map((prayer) => {
          const isUserAuthor = prayer.authorId === currentUserId;
          const hasUserPrayed = prayer.prayedUserIds?.includes(currentUserId);
          const isAnswered = prayer.status === 'answered';
          const isConfidential = prayer.isConfidentialToPastors;

          return (
            <Card
              key={prayer.id}
              className={`p-5 sm:p-6 bg-white border transition-all space-y-4 ${
                isAnswered 
                  ? 'border-amber-300 bg-gradient-to-b from-amber-50/30 to-white shadow-xs' 
                  : isConfidential 
                    ? 'border-rose-200 bg-rose-50/20' 
                    : 'border-slate-200/80 hover:border-slate-300'
              }`}
            >
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      {prayer.category}
                    </span>

                    {isAnswered && (
                      <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1">
                        <Trophy className="w-3 h-3 text-amber-600" />
                        Praise Testimony • Answered
                      </span>
                    )}

                    {isConfidential && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                        <Shield className="w-3 h-3 text-rose-600" />
                        Pastoral & Intercessory Only
                      </span>
                    )}

                    {prayer.isAnonymous && (
                      <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                        <EyeOff className="w-3 h-3" />
                        Anonymous Post
                      </span>
                    )}
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    {prayer.title}
                  </h3>
                </div>

                <div className="text-left sm:text-right shrink-0 text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-700 block">{prayer.authorName}</span>
                  <span>{formatDateReadable(prayer.createdAt?.split('T')[0] || '')}</span>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                {prayer.description}
              </p>

              {/* If Answered: Glory Testimony Box */}
              {isAnswered && prayer.testimony && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 text-amber-950 space-y-1">
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    Praise Report & Answered Testimony
                  </span>
                  <p className="text-xs text-amber-900/90 leading-relaxed italic">
                    "{prayer.testimony}"
                  </p>
                  {prayer.answeredAt && (
                    <span className="text-[10px] text-amber-700 block pt-1">
                      Recorded on {formatDateReadable(prayer.answeredAt.split('T')[0])}
                    </span>
                  )}
                </div>
              )}

              {/* Action Bar */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {/* "I Prayed for This" Button */}
                  <Button
                    type="button"
                    variant={hasUserPrayed ? 'primary' : 'outline'}
                    size="sm"
                    icon={<Heart className={`w-3.5 h-3.5 ${hasUserPrayed ? 'fill-white' : 'text-rose-500'}`} />}
                    onClick={() => handleTogglePray(prayer)}
                    className="text-xs font-semibold"
                  >
                    {hasUserPrayed ? 'I Stood in Prayer' : 'I Prayed for This'}
                    <span className="ml-1 px-1.5 py-0.2 rounded-md bg-black/10 text-[11px]">
                      {prayer.prayCount || 0}
                    </span>
                  </Button>

                  {/* Toggle Encouragement Drawer */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    icon={<MessageCircle className="w-3.5 h-3.5 text-slate-500" />}
                    onClick={() => setExpandedEncouragementId(prev => prev === prayer.id ? null : prayer.id)}
                    className="text-xs text-slate-600 hover:text-slate-900"
                  >
                    Words of Comfort ({prayer.encouragements?.length || 0})
                  </Button>
                </div>

                {/* Author or Admin Controls */}
                <div className="flex items-center gap-2">
                  {!isAnswered && (isUserAuthor || isAdmin) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      icon={<Trophy className="w-3.5 h-3.5 text-amber-600" />}
                      onClick={() => {
                        setTestimonyModalPrayer(prayer);
                        setTestimonyText('');
                      }}
                      className="text-xs text-amber-700 hover:text-amber-800 hover:bg-amber-50 border-amber-200"
                    >
                      Mark Answered
                    </Button>
                  )}

                  {(isUserAuthor || isAdmin) && (
                    <button
                      type="button"
                      onClick={() => handleDeletePrayer(prayer.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                      title="Delete prayer request"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Encouragements Drawer */}
              {expandedEncouragementId === prayer.id && (
                <div className="pt-3 border-t border-slate-100 space-y-3 bg-slate-50/60 p-3.5 rounded-2xl">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    Scripture & Prayer Notes ({prayer.encouragements?.length || 0})
                  </span>

                  {/* List of existing notes */}
                  {prayer.encouragements && prayer.encouragements.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {prayer.encouragements.map(enc => (
                        <div key={enc.id} className="p-2.5 bg-white rounded-xl border border-slate-200/70 text-xs space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span className="font-bold text-slate-800">{enc.authorName}</span>
                            <span>{formatDateReadable(enc.createdAt.split('T')[0])}</span>
                          </div>
                          <p className="text-slate-600 italic">"{enc.message}"</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No notes left yet. Be the first to share a verse of encouragement!</p>
                  )}

                  {/* Scripture Prompt Chips */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[10px] font-semibold text-slate-400">Quick Scripture:</span>
                    {SCRIPTURE_PROMPTS.map(sc => (
                      <button
                        key={sc}
                        type="button"
                        onClick={() => setEncouragementNote(prev => prev ? `${prev} Stand on ${sc}!` : `Standing in faith with you on ${sc}. God is faithful!`)}
                        className="text-[10px] bg-white border border-slate-200 hover:border-emerald-300 text-slate-600 hover:text-emerald-700 px-2 py-0.5 rounded-md font-medium transition-colors"
                      >
                        {sc}
                      </button>
                    ))}
                  </div>

                  {/* Post New Note Input */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={encouragementNote}
                      onChange={(e) => setEncouragementNote(e.target.value)}
                      placeholder="Write an encouraging verse or prayer note..."
                      className="flex-1 text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSendEncouragement(prayer.id);
                      }}
                    />
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      icon={<Send className="w-3.5 h-3.5" />}
                      onClick={() => handleSendEncouragement(prayer.id)}
                      loading={sendingNote}
                      className="text-xs shrink-0"
                    >
                      Post Note
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}

        {filteredPrayers.length === 0 && !loading && (
          <Card className="p-12 text-center border-dashed border-slate-200 space-y-3">
            <Heart className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-700">No prayer petitions found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              There are no prayer requests matching your current filter. Lift your own need or click "All Petitions" to pray for others.
            </p>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setIsCreateModalOpen(true)}
              className="mx-auto"
            >
              Post First Prayer Need
            </Button>
          </Card>
        )}
      </div>

      {/* CREATE PRAYER REQUEST MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Post a Congregation Prayer Need"
        maxWidth="md"
      >
        <form onSubmit={handleCreatePrayer} className="space-y-4 text-left">
          {createError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{createError}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Prayer Need Title *</label>
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Divine healing for my sister, Wisdom in final exams..."
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Category *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as PrayerCategory)}
              className="w-full text-xs px-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Detailed Petition & Scripture Stand *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Share your burden or petition so the congregation and prayer band can agree with you in faith..."
              rows={4}
              required
              className="w-full text-xs p-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-normal text-slate-800 leading-relaxed resize-none"
            />
          </div>

          {/* Privacy & Confidentiality Toggles */}
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2.5 text-xs">
            <span className="font-bold text-slate-800 block">Confidentiality Options</span>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
              />
              <div>
                <span className="font-semibold text-slate-800">Post Anonymously</span>
                <span className="block text-[11px] text-slate-500">Your name and membership ID will not be shown to others.</span>
              </div>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer pt-1 border-t border-slate-200/60">
              <input
                type="checkbox"
                checked={isConfidentialToPastors}
                onChange={(e) => setIsConfidentialToPastors(e.target.checked)}
                className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300"
              />
              <div>
                <span className="font-semibold text-rose-900 flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-rose-600" />
                  Pastoral & Intercessors Only
                </span>
                <span className="block text-[11px] text-slate-500">
                  Keep strictly confidential between you, church pastors, and the intercessory prayer team.
                </span>
              </div>
            </label>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={submitting}
              icon={<Heart className="w-4 h-4" />}
            >
              Post to Prayer Wall
            </Button>
          </div>
        </form>
      </Modal>

      {/* ANSWERED TESTIMONY MODAL */}
      {testimonyModalPrayer && (
        <Modal
          isOpen={!!testimonyModalPrayer}
          onClose={() => setTestimonyModalPrayer(null)}
          title="Mark Prayer as Answered"
          maxWidth="md"
        >
          <form onSubmit={handleMarkAsAnswered} className="space-y-4 text-left">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
              <span className="font-bold flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-600" />
                Praising God with the Congregation
              </span>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                When God answers our prayers, our praise strengthens the faith of our brothers and sisters. Share how God came through!
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Praise Testimony / Answered Report</label>
              <textarea
                value={testimonyText}
                onChange={(e) => setTestimonyText(e.target.value)}
                placeholder="Share how God miraculously responded to this need..."
                rows={4}
                required
                className="w-full text-xs p-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-normal text-slate-800 leading-relaxed resize-none"
              />
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setTestimonyModalPrayer(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={submittingTestimony}
                icon={<Sparkles className="w-4 h-4" />}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                Record Answered Testimony
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
