import { useState, useEffect, useRef } from 'react';
import { Info } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { DashboardHeader } from './components/DashboardHeader';
import { KpiCards } from './components/KpiCards';
import { BidTable } from './components/BidTable';
import { BidDetailPanel } from './components/BidDetailPanel';
import { LoginPage, type User } from './components/LoginPage';
import { SettingsPage } from './components/SettingsPage';
import { BookmarkPage } from './components/BookmarkPage';
import { ProjectPage } from './components/ProjectPage';
import { BidListPage } from './components/BidListPage';
import { BottomWidgets } from './components/BottomWidgets';
import { type Bid, type BidFlags, type AiStatusType, getDaysUntilDeadline } from './types';
import { useToast } from './components/ToastProvider';
import { AnalysisDetailPage } from './components/AnalysisDetailPage';
import { AnalysisListPage } from './components/AnalysisListPage';
import { StrategyReportPage } from './components/StrategyReportPage';
import { ProposalPage } from './components/ProposalPage';
import { ProposalOutlinePage } from './components/ProposalOutlinePage';
import { AdminLLMPage } from './components/AdminLLMPage';
import { AdminPoisonPage } from './components/AdminPoisonPage';
import { AdminStatusPage } from './components/AdminStatusPage';
import {
  fetchBids,
  fetchBidById,
  toggleBookmarkApi,
  toggleInProgressApi,
  updateBidManagersApi,
  requestAnalysisApi,
  fetchAnalysisStatus,
  uploadAttachmentApi,
  requestOutlineApi,
  fetchOutline,
  fetchOutlineStatus,
  downloadOutlineExcel,
  type ProposalOutline,
  fetchDashboardStats,
  fetchTypeStats,
  deleteAnalysisApi,
  collectBidsApi,
  loginApi,
  setAuthToken,
  fetchAgencySettings,
  saveAgencySettings,
  type ApiDashboardStats,
  type ApiTypeStatItem,
} from './services/api';

const CEO_ALLOWED_PAGES: PageType[] = ['대시보드', '진행 프로젝트', '전략 리포트', '설정'];
const ADMIN_ALLOWED_PAGES: PageType[] = ['대시보드', 'LLM 설정', '독소조항 설정', '시스템 현황'];

export type PageType = '대시보드' | '공고 목록' | '관심 공고' | '진행 프로젝트' | 'AI 분석' | '제안목차' | '목차 현황' | '현황 요약' | '전략 리포트' | '설정' | 'LLM 설정' | '독소조항 설정' | '시스템 현황';

export interface AgencySettings {
  preferred: string[];
  avoided: string[];
}

export interface NotificationItem {
  id: string;
  type: 'sync' | 'analysis_complete' | 'analysis_fail' | 'bookmark' | 'inprogress';
  title: string;
  message: string;
  createdAt: Date;
  isRead: boolean;
}

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = sessionStorage.getItem('koneps_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loginError, setLoginError] = useState('');

  const handleLogin = async (username: string, password: string) => {
    setLoginError('');
    const apiUser = await loginApi(username, password);
    if (apiUser) {
      const userInfo: User = { id: apiUser.id, username: apiUser.username, name: apiUser.name, role: apiUser.role as User['role'] };
      setAuthToken(apiUser.access_token);
      sessionStorage.setItem('koneps_user', JSON.stringify(userInfo));
      setUser(userInfo);
      return;
    }
    setLoginError('아이디 또는 비밀번호가 올바르지 않습니다.');
  };
  const CACHE_VERSION = 'v2';

  const [bids, setBids] = useState<Bid[]>(() => {
    try {
      const version = sessionStorage.getItem('koneps_bids_version');
      if (version !== CACHE_VERSION) {
        sessionStorage.removeItem('koneps_bids');
        sessionStorage.removeItem('koneps_bids_time');
        sessionStorage.removeItem('koneps_bidflags');
        return [];
      }
      const cached = sessionStorage.getItem('koneps_bids');
      const cachedTime = sessionStorage.getItem('koneps_bids_time');
      if (cached && cachedTime) {
        const age = Date.now() - Number(cachedTime);
        if (age < 30 * 60 * 1000) {
          return JSON.parse(cached);
        }
      }
      return [];
    } catch {
      return [];
    }
  });
  const [isFetching, setIsFetching] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(() => {
    const t = sessionStorage.getItem('koneps_bids_time');
    return t ? new Date(Number(t)) : null;
  });
  const [selectedBid, setSelectedBid] = useState<Bid | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activePage, setActivePage] = useState<PageType>(() => {
    const saved = localStorage.getItem('koneps:activePage');
    return (saved as PageType) ?? '대시보드';
  });
  const [bidFlags, setBidFlags] = useState<Record<string, BidFlags>>(() => {
    try {
      const cached = sessionStorage.getItem('koneps_bidflags');
      return cached ? JSON.parse(cached) : {};
    } catch {
      return {};
    }
  });
  const [aiStatuses, setAiStatuses] = useState<Record<string, AiStatusType>>({});
  const [analysisLogsMap, setAnalysisLogsMap] = useState<Record<string, AnalysisLog[]>>(() => {
    try {
      const cached = sessionStorage.getItem('koneps_analysis_logs');
      return cached ? JSON.parse(cached) : {};
    } catch {
      return {};
    }
  });
  const [outlinesMap, setOutlinesMap] = useState<Record<string, ProposalOutline>>({});
  const [outlineLogsMap, setOutlineLogsMap] = useState<Record<string, AnalysisLog[]>>({});
  const [outlineStatusMap, setOutlineStatusMap] = useState<Record<string, 'none' | 'generating' | 'complete'>>({});
  const outlineStatusRef = useRef<Record<string, 'none' | 'generating' | 'complete'>>({});
  const outlineTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [dashboardStats, setDashboardStats] = useState<ApiDashboardStats | null>(null);
  const [typeStats, setTypeStats] = useState<ApiTypeStatItem[]>([]);
  const { showToast } = useToast();

  const addNotification = (item: Omit<NotificationItem, 'id' | 'createdAt' | 'isRead'>) => {
    setNotifications(prev => [{
      ...item,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      isRead: false,
    }, ...prev].slice(0, 50));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const clearNotifications = () => setNotifications([]);

  const analysisTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const aiStatusesRef = useRef<Record<string, AiStatusType>>({});

  const handleSync = async () => {
    setIsFetching(true);
    try {
      await collectBidsApi();
      const [{ bids: fetchedBids, flags }, stats, types] = await Promise.all([
        fetchBids(),
        fetchDashboardStats(),
        fetchTypeStats(),
      ]);
      setBids(fetchedBids);
      syncAiStatusesFromList(fetchedBids);
      setBidFlags(prev => {
        const merged = { ...prev };
        Object.entries(flags).forEach(([id, flag]) => {
          merged[id] = { bookmarked: flag.bookmarked, inProgress: flag.inProgress };
        });
        return merged;
      });
      setDashboardStats(stats);
      setTypeStats(types);
      setLastSyncTime(new Date());
      addNotification({
        type: 'sync',
        title: '동기화 완료',
        message: `공고 ${fetchedBids.length}건이 업데이트되었습니다`,
      });
    } finally {
      setIsFetching(false);
    }
  };

  const loadBids = async () => {
    setIsFetching(true);
    try {
      const [{ bids: fetchedBids, flags }, stats, types] = await Promise.all([
        fetchBids(),
        fetchDashboardStats(),
        fetchTypeStats(),
      ]);
      setBids(fetchedBids);
      sessionStorage.setItem('koneps_bids', JSON.stringify(fetchedBids));
      const now = Date.now();
      sessionStorage.setItem('koneps_bids_time', String(now));
      sessionStorage.setItem('koneps_bids_version', CACHE_VERSION);
      setLastSyncTime(new Date(now));
      setBidFlags(prev => {
        const merged = { ...prev };
        Object.entries(flags).forEach(([id, flag]) => {
          merged[id] = { bookmarked: flag.bookmarked, inProgress: flag.inProgress };
        });
        sessionStorage.setItem('koneps_bidflags', JSON.stringify(merged));
        return merged;
      });
      setDashboardStats(stats);
      setTypeStats(types);
    } finally {
      setIsFetching(false);
    }
  };

  // 로그인 상태 변경 시 캐시 확인 후 자동 로딩
  useEffect(() => {
    if (!user) return;
    const cachedTime = sessionStorage.getItem('koneps_bids_time');
    const age = cachedTime ? Date.now() - Number(cachedTime) : Infinity;
    // 캐시 없거나 30분 초과 시 새로 불러오기
    if (age >= 30 * 60 * 1000) {
      loadBids();
    }
  }, [user]);

  useEffect(() => {
    // 로그인 전에는 보호 API를 부르지 않는다 (401 + 리로드 루프 방지).
    if (!user) return;
    Promise.all([
      fetchBids().then(({ bids: fetchedBids, flags }) => {
        setBids(fetchedBids);
        syncAiStatusesFromList(fetchedBids);
        setBidFlags(prev => {
          const merged = { ...prev };
          Object.entries(flags).forEach(([id, flag]) => {
            merged[id] = { bookmarked: flag.bookmarked, inProgress: flag.inProgress };
          });
          return merged;
        });
      }),
      fetchDashboardStats().then(setDashboardStats),
      fetchTypeStats().then(setTypeStats),
    ]);
  }, [user]);

  const requestAnalysis = async (bidId: string, opts?: { force?: boolean; rerun?: boolean }) => {
    // force: 백엔드 호출 생략 (업로드 흐름 — 이미 트리거됨)
    // rerun: 완료 상태도 무시하고 다시 실행 (사용자가 "AI 재분석" 버튼 누름)
    const force = opts?.force === true;
    const rerun = opts?.rerun === true;
    const current = aiStatusesRef.current[bidId] ?? 'none';
    if (current === 'analyzing') return; // 진행 중엔 항상 무시 (중복 트리거 방지)
    if (!force && !rerun && current === 'complete') return; // 완료된 건 rerun/force 없으면 스킵
    if (analysisTimers.current[bidId]) return;

    aiStatusesRef.current = { ...aiStatusesRef.current, [bidId]: 'analyzing' };
    setAiStatuses(prev => ({ ...prev, [bidId]: 'analyzing' }));
    setAnalysisLogsMap(prev => ({ ...prev, [bidId]: [] }));

    // force 모드(업로드 후 재분석)는 백엔드에서 이미 트리거되었으므로 호출 생략.
    const success = force ? true : await requestAnalysisApi(bidId);

    if (!success) {
      aiStatusesRef.current = { ...aiStatusesRef.current, [bidId]: 'none' };
      setAiStatuses(prev => ({ ...prev, [bidId]: 'none' }));
      showToast('info', 'AI 분석 기능이 아직 준비 중입니다');
      addNotification({ type: 'analysis_fail', title: 'AI 분석 실패', message: 'AI 분석 기능이 아직 준비 중입니다' });
      return;
    }

    // 백엔드 분석은 BackgroundTasks(비동기)로 수십 초 ~ 수 분 소요.
    // 폴링으로 pipeline_status가 'analyzed'(=aiStatus 'complete')가 될 때까지 대기 후 detail 갱신.
    const startTime = Date.now();
    const MAX_MS = 5 * 60 * 1000;
    const POLL_MS = 3000;

    const poll = async () => {
      if ((aiStatusesRef.current[bidId] ?? 'none') !== 'analyzing') {
        delete analysisTimers.current[bidId];
        return;
      }
      if (Date.now() - startTime > MAX_MS) {
        aiStatusesRef.current = { ...aiStatusesRef.current, [bidId]: 'none' };
        setAiStatuses(prev => ({ ...prev, [bidId]: 'none' }));
        showToast('warning', 'AI 분석이 시간 초과되었습니다');
        delete analysisTimers.current[bidId];
        return;
      }
      try {
        const { pipelineStatus, logs } = await fetchAnalysisStatus(bidId);
        setAnalysisLogsMap(prev => ({ ...prev, [bidId]: logs }));
        if (pipelineStatus === 'analyzed') {
          if (logs && logs.length > 0) {
            setAnalysisLogsMap(prev => ({ ...prev, [bidId]: logs }));
          }
          const detailed = await fetchBidById(bidId);
          aiStatusesRef.current = { ...aiStatusesRef.current, [bidId]: 'complete' };
          setAiStatuses(prev => ({ ...prev, [bidId]: 'complete' }));
          setBids(prev => prev.map(b => b.id === bidId ? { ...b, ...detailed } : b));
          setSelectedBid(prev => (prev && prev.id === bidId) ? detailed : prev);
          setAnalysisDetailBid(prev => (prev && prev.id === bidId) ? detailed : prev);
          showToast('success', `AI 분석이 완료되었습니다 — ${detailed.title}`);
          addNotification({ type: 'analysis_complete', title: 'AI 분석 완료', message: `${detailed.title} 분석이 완료되었습니다` });
          delete analysisTimers.current[bidId];
          return;
        }
        if (pipelineStatus === 'failed') {
          aiStatusesRef.current = { ...aiStatusesRef.current, [bidId]: 'none' };
          setAiStatuses(prev => ({ ...prev, [bidId]: 'none' }));
          showToast('warning', `AI 분석이 실패했습니다 — ${bids.find(b => b.id === bidId)?.title ?? bidId}`);
          delete analysisTimers.current[bidId];
          return;
        }
      } catch {
        // 일시 오류는 다음 폴링에서 재시도
      }
      analysisTimers.current[bidId] = setTimeout(poll, POLL_MS);
    };
    analysisTimers.current[bidId] = setTimeout(poll, POLL_MS);
  };

  /** 분석 결과 삭제 — 백엔드에서 analysis_result 행 제거 + pipeline_status='collected' 되돌림. */
  const deleteAnalysis = async (bidId: string): Promise<boolean> => {
    // 분석 중이면 백엔드가 409 → 그냥 false 반환
    if ((aiStatusesRef.current[bidId] ?? 'none') === 'analyzing') return false;

    const ok = await deleteAnalysisApi(bidId);
    if (!ok) return false;

    // 로컬 상태 초기화
    aiStatusesRef.current = { ...aiStatusesRef.current, [bidId]: 'none' };
    setAiStatuses(prev => ({ ...prev, [bidId]: 'none' }));
    setAnalysisLogsMap(prev => ({ ...prev, [bidId]: [] }));

    // bids/selected/detail 의 analysis 관련 필드도 갱신 (재조회)
    try {
      const refreshed = await fetchBidById(bidId);
      setBids(prev => prev.map(b => b.id === bidId ? { ...b, ...refreshed } : b));
      setSelectedBid(prev => (prev && prev.id === bidId) ? refreshed : prev);
      setAnalysisDetailBid(prev => (prev && prev.id === bidId) ? refreshed : prev);
    } catch {
      // 재조회 실패해도 위 상태 리셋은 유효
    }
    return true;
  };

  const requestOutline = async (bidId: string, opts?: { force?: boolean }) => {
    const force = opts?.force === true;
    const current = outlineStatusRef.current[bidId] ?? 'none';
    if (current === 'generating') return;          // 중복 클릭 차단
    if (!force && current === 'complete') return;  // 이미 있음 — 재생성은 force 필요

    // 진행 중 타이머 정리 (재생성 경로)
    if (outlineTimers.current[bidId]) {
      clearTimeout(outlineTimers.current[bidId]);
      delete outlineTimers.current[bidId];
    }

    outlineStatusRef.current = { ...outlineStatusRef.current, [bidId]: 'generating' };
    setOutlineStatusMap(prev => ({ ...prev, [bidId]: 'generating' }));
    setOutlineLogsMap(prev => ({ ...prev, [bidId]: [] }));

    const bid = bids.find(b => b.id === bidId);
    if (!bid) {
      outlineStatusRef.current = { ...outlineStatusRef.current, [bidId]: 'none' };
      setOutlineStatusMap(prev => ({ ...prev, [bidId]: 'none' }));
      return;
    }
    const success = await requestOutlineApi(bid.number);
    if (!success) {
      // 재생성이면 기존 상태로 복귀, 첫 생성이면 none
      const restoreTo = force ? 'complete' : 'none';
      outlineStatusRef.current = { ...outlineStatusRef.current, [bidId]: restoreTo };
      setOutlineStatusMap(prev => ({ ...prev, [bidId]: restoreTo }));
      showToast('warning', '제안목차 생성 요청 실패');
      return;
    }

    if (force) {
      showToast('info', '제안목차 재생성을 시작합니다');
    }

    const startTime = Date.now();
    const MAX_MS = 5 * 60 * 1000;
    const POLL_MS = 3000;

    const poll = async () => {
      if ((outlineStatusRef.current[bidId] ?? 'none') !== 'generating') {
        delete outlineTimers.current[bidId];
        return;
      }
      if (Date.now() - startTime > MAX_MS) {
        // 시간 초과: force면 기존 outline 유지, 아니면 none
        const restoreTo = force ? 'complete' : 'none';
        outlineStatusRef.current = { ...outlineStatusRef.current, [bidId]: restoreTo };
        setOutlineStatusMap(prev => ({ ...prev, [bidId]: restoreTo }));
        showToast('warning', '제안목차 생성 시간 초과');
        delete outlineTimers.current[bidId];
        return;
      }
      try {
        const { exists, logs } = await fetchOutlineStatus(bid.number);
        setOutlineLogsMap(prev => ({ ...prev, [bidId]: logs }));
        // 완료 판정: "DB 저장 완료" success 로그 + exists.
        // 이전 결과의 로그는 백엔드 progress_store.clear()로 비워졌으므로
        // logs는 항상 이번 실행분만 들어있다.
        const completed = exists && logs.some(
          l => l.status === 'success' && (l.message || '').includes('DB 저장 완료'),
        );
        if (completed) {
          const outline = await fetchOutline(bid.number);
          if (outline) {
            setOutlinesMap(prev => ({ ...prev, [bidId]: outline }));
            outlineStatusRef.current = { ...outlineStatusRef.current, [bidId]: 'complete' };
            setOutlineStatusMap(prev => ({ ...prev, [bidId]: 'complete' }));
            showToast('success', force ? '제안목차 재생성 완료' : '제안목차 생성 완료');
            delete outlineTimers.current[bidId];
            return;
          }
        }
        // 실패 로그 감지
        const failed = logs.some(l => l.status === 'error');
        if (failed) {
          const restoreTo = force ? 'complete' : 'none';
          outlineStatusRef.current = { ...outlineStatusRef.current, [bidId]: restoreTo };
          setOutlineStatusMap(prev => ({ ...prev, [bidId]: restoreTo }));
          showToast('warning', '제안목차 생성 실패 — 로그를 확인하세요');
          delete outlineTimers.current[bidId];
          return;
        }
      } catch {
        // 일시 오류 → 다음 폴링 재시도
      }
      outlineTimers.current[bidId] = setTimeout(poll, POLL_MS);
    };
    outlineTimers.current[bidId] = setTimeout(poll, POLL_MS);
  };

  /** 재생성 헬퍼 — UI 컴포넌트가 단순 callback으로 호출하도록 */
  const regenerateOutline = (bidId: string) => requestOutline(bidId, { force: true });

  /** 사용자가 RFP/과업지시서 등을 직접 업로드 → 백엔드가 자동 재분석 시작.
   *  여기서는 상태를 'analyzing'으로 되돌리고 폴링을 다시 켠다. */
  const uploadAttachment = async (bidId: string, file: File): Promise<boolean> => {
    const res = await uploadAttachmentApi(bidId, file);
    if (!res.ok) {
      showToast('warning', res.error ?? '업로드 실패');
      return false;
    }
    // 진행 중 폴링이 있다면 종료하고 force 모드로 재시작
    if (analysisTimers.current[bidId]) {
      clearTimeout(analysisTimers.current[bidId]);
      delete analysisTimers.current[bidId];
    }
    aiStatusesRef.current = { ...aiStatusesRef.current, [bidId]: 'none' };
    setAiStatuses(prev => ({ ...prev, [bidId]: 'none' }));
    // 백엔드가 BackgroundTasks로 트리거했으므로 force=true (재호출 방지)
    requestAnalysis(bidId, { force: true });
    addNotification({
      type: 'analysis_fail',
      title: '자료 업로드 완료',
      message: `${res.file_name} 업로드 — AI 재분석을 시작합니다.`,
    });
    return true;
  };

  const resetAnalysis = (bidId: string) => {
    if (analysisTimers.current[bidId]) {
      clearTimeout(analysisTimers.current[bidId]);
      delete analysisTimers.current[bidId];
    }
    aiStatusesRef.current = { ...aiStatusesRef.current, [bidId]: 'none' };
    setAiStatuses(prev => ({ ...prev, [bidId]: 'none' }));
  };

const toggleBookmark = (bidId: string) => {
    const current = bidFlags[bidId] ?? { bookmarked: false, inProgress: false };
    const newBookmarked = !current.bookmarked;
    setBidFlags(prev => ({ ...prev, [bidId]: { ...current, bookmarked: newBookmarked } }));
    if (newBookmarked) {
      const bid = bids.find(b => b.id === bidId);
      if (bid) addNotification({ type: 'bookmark', title: '관심 공고 추가', message: `${bid.title}을 관심 공고에 추가했습니다` });
    }
    toggleBookmarkApi(bidId, newBookmarked).then(success => {
      if (!success) {
        setBidFlags(prev => ({ ...prev, [bidId]: { ...prev[bidId], bookmarked: !newBookmarked } }));
      }
    });
  };

  const toggleInProgress = (bidId: string) => {
    const current = bidFlags[bidId] ?? { bookmarked: false, inProgress: false };
    const newInProgress = !current.inProgress;
    setBidFlags(prev => ({ ...prev, [bidId]: { ...current, inProgress: newInProgress } }));
    toggleInProgressApi(bidId, newInProgress).then(success => {
      if (!success) {
        setBidFlags(prev => ({ ...prev, [bidId]: { ...prev[bidId], inProgress: !newInProgress } }));
      }
    });
    if (newInProgress) {
      const bid = bids.find(b => b.id === bidId);
      if (bid) addNotification({ type: 'inprogress', title: '진행 프로젝트 추가', message: `${bid.title}을 진행 프로젝트에 추가했습니다` });
      requestAnalysis(bidId);
    } else if (!current.bookmarked) {
      resetAnalysis(bidId);
    }
  };

  const updateBidManagers = async (bidId: string, salesManager: string, projectPm: string) => {
    const bid = bids.find(b => b.id === bidId);
    if (!bid) return;
    setBids(prev => prev.map(b => b.id === bidId ? { ...b, salesManager, projectPm } : b));
    await updateBidManagersApi(bid.number, salesManager, projectPm);
  };

  const [analysisDetailBid, setAnalysisDetailBid] = useState<Bid | null>(null);
  const [showAnalysisDetail, setShowAnalysisDetail] = useState<boolean>(
    () => localStorage.getItem('koneps:showAnalysisDetail') === 'true'
  );

  const openAnalysisDetail = (bid: Bid) => {
    setAnalysisDetailBid(bid);
    setShowAnalysisDetail(true);
    // 이미 서버에서 'complete'으로 내려왔다면 런타임 aiStatuses에도 즉시 반영
    syncAiStatus(bid);
    // 분석은 완료됐지만 detail이 비어있으면(리스트에서 바로 진입) 상세를 가져온다.
    if (bid.aiStatus === 'complete' && !bid.detail) {
      fetchBidById(bid.id)
        .then((detailed) => {
          setAnalysisDetailBid(detailed);
          syncAiStatus(detailed);
          setBids(prev => prev.map(b => b.id === bid.id ? { ...b, ...detailed } : b));
        })
        .catch(() => {});
    }
  };

  useEffect(() => {
    try {
      sessionStorage.setItem('koneps_analysis_logs', JSON.stringify(analysisLogsMap));
    } catch {}
  }, [analysisLogsMap]);

  // 새로고침해도 페이지/AI 분석 화면이 유지되도록 localStorage에 persist
  useEffect(() => {
    localStorage.setItem('koneps:activePage', activePage);
  }, [activePage]);

  useEffect(() => {
    localStorage.setItem('koneps:showAnalysisDetail', String(showAnalysisDetail));
  }, [showAnalysisDetail]);

  // analysisDetailBid이 set될 때만 저장. mount 시 null이라고 지우지 않음 (그러면 새로고침마다 자기파괴).
  useEffect(() => {
    if (analysisDetailBid) {
      localStorage.setItem('koneps:analysisDetailBidId', analysisDetailBid.id);
    }
  }, [analysisDetailBid]);

  // 새로고침 후 AI 분석 페이지를 보고 있었다면 상세를 다시 가져와 복원
  useEffect(() => {
    if (!user) return;
    if (analysisDetailBid) return;
    if (!showAnalysisDetail) return;  // 닫혀있던 페이지는 굳이 복원하지 않음
    const savedId = localStorage.getItem('koneps:analysisDetailBidId');
    if (!savedId) return;
    fetchBidById(savedId)
      .then((b) => {
        setAnalysisDetailBid(b);
        if (b.aiStatus === 'complete') {
          aiStatusesRef.current = { ...aiStatusesRef.current, [b.id]: 'complete' };
          setAiStatuses(prev => ({ ...prev, [b.id]: 'complete' }));
        }
      })
      .catch(() => {});
  }, [user, showAnalysisDetail]);

  const [agencySettings, setAgencySettings] = useState<AgencySettings>({
    preferred: ['행정안전부', '국토교통부'],
    avoided: ['금융감독원'],
  });

  useEffect(() => {
    if (!user) return;
    if (user.id === 0) return;
    fetchAgencySettings(user.id).then(settings => {
      setAgencySettings(settings);
    });
  }, [user?.id]);

  useEffect(() => {
    if (!user || user.role !== 'ceo') return;
    if (!CEO_ALLOWED_PAGES.includes(activePage)) setActivePage('대시보드');
  }, [user, activePage]);

  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    if (!ADMIN_ALLOWED_PAGES.includes(activePage)) setActivePage('대시보드');
  }, [user, activePage]);

  const syncAiStatus = (bid: Bid) => {
    // 서버 분석 상태(pipeline_status 기반 bid.aiStatus)를 런타임 aiStatuses에 반영.
    // 이미 분석된 공고를 목록/검색에서 열었을 때 분석 결과가 보이도록 한다.
    if (bid.aiStatus === 'complete') {
      setAiStatuses(prev => ({ ...prev, [bid.id]: 'complete' }));
      aiStatusesRef.current = { ...aiStatusesRef.current, [bid.id]: 'complete' };
    }
  };

  /** 목록 응답에 'complete'으로 내려온 공고들을 런타임 aiStatuses에 일괄 반영. */
  const syncAiStatusesFromList = (list: Bid[]) => {
    const completed: Record<string, AiStatusType> = {};
    for (const b of list) {
      if (b.aiStatus === 'complete') completed[b.id] = 'complete';
    }
    if (Object.keys(completed).length === 0) return;
    setAiStatuses(prev => ({ ...prev, ...completed }));
    aiStatusesRef.current = { ...aiStatusesRef.current, ...completed };
  };

  const handleSelectBid = async (bid: Bid) => {
    setSelectedBid(bid);
    syncAiStatus(bid);
    if (bid.detail) return;
    setDetailLoading(true);
    try {
      const detailed = await fetchBidById(bid.id);
      setSelectedBid(detailed);
      syncAiStatus(detailed);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('koneps_user');
    sessionStorage.removeItem('koneps_bids');
    sessionStorage.removeItem('koneps_bids_time');
    sessionStorage.removeItem('koneps_bidflags');
    setUser(null);
  };

  const handleDirectLogin = (adminUser: User) => {
    sessionStorage.setItem('koneps_user', JSON.stringify(adminUser));
    setUser(adminUser);
  };

  if (!user) {
    return <LoginPage onLogin={handleLogin} loginError={loginError} onDirectLogin={handleDirectLogin} />;
  }

  const isCeo = user.role === 'ceo';
  const isAdmin = user.role === 'admin';
  const inProgressBids = bids.filter(b => bidFlags[b.id]?.inProgress ?? false);
  const analysisCompleteCount = Object.values(aiStatuses).filter(s => s === 'complete').length;
  const activeBidCount = bids.filter(b => getDaysUntilDeadline(b.deadline) >= 0).length;

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{
        backgroundColor: 'var(--dash-bg)',
        fontFamily: "'Noto Sans KR', -apple-system, BlinkMacSystemFont, sans-serif",
        minWidth: '1200px',
      }}
    >
      <Sidebar role={user.role} activePage={activePage} onNavigate={setActivePage} analysisCompleteCount={analysisCompleteCount} totalBidCount={activeBidCount} lastSyncTime={lastSyncTime} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <DashboardHeader
          user={user}
          onLogout={() => { setAuthToken(null); sessionStorage.removeItem('koneps_user'); sessionStorage.removeItem('koneps_analysis_logs'); setUser(null); }}
          notifications={notifications}
          onMarkAllAsRead={markAllAsRead}
          onMarkAsRead={markAsRead}
          onClearNotifications={clearNotifications}
          onSync={handleSync}
          isSyncing={isFetching}
          onOpenAnalysisDetail={openAnalysisDetail}
        />
        {isFetching && (
          <div style={{ height: '2px', backgroundColor: 'var(--dash-border)', flexShrink: 0 }}>
            <div
              style={{
                height: '100%',
                backgroundColor: '#2563EB',
                animation: 'fetchProgress 1.2s ease-in-out infinite',
              }}
            />
          </div>
        )}
        <main
          className="flex-1 overflow-y-auto"
          style={{
            padding: '20px',
            gap: '16px',
            display: 'flex',
            flexDirection: 'column',
            scrollbarWidth: 'thin',
            scrollbarColor: 'var(--dash-scrollbar) transparent',
          }}
        >
          {activePage === '설정' ? (
            <SettingsPage
              settings={agencySettings}
              onSave={async (newSettings) => {
                setAgencySettings(newSettings);
                if (user && user.id !== 0) {
                  const ok = await saveAgencySettings(user.id, newSettings.preferred, newSettings.avoided);
                  if (ok) {
                    showToast('success', '설정이 저장되었습니다');
                  } else {
                    showToast('warning', '설정 저장에 실패했습니다');
                  }
                } else {
                  showToast('success', '설정이 저장되었습니다');
                }
              }}
              agencyList={[...new Set(bids.map(b => b.agency).filter(Boolean))].sort()}
            />
          ) : activePage === '공고 목록' ? (
            <BidListPage
              bids={bids}
              bidFlags={bidFlags}
              aiStatuses={aiStatuses}
              onToggleBookmark={toggleBookmark}
              onToggleInProgress={toggleInProgress}
              onOpenAnalysisDetail={openAnalysisDetail}
              onRequestAnalysis={requestAnalysis}
              analysisLogsMap={analysisLogsMap}
              outlineStatusMap={outlineStatusMap}
              onRequestOutline={requestOutline}
              onDownloadOutline={downloadOutlineExcel}
              onUpdateManagers={updateBidManagers}
            />
          ) : activePage === 'AI 분석' ? (
            <AnalysisListPage
              bids={bids}
              aiStatuses={aiStatuses}
              bidFlags={bidFlags}
              onOpenAnalysisDetail={openAnalysisDetail}
              onToggleBookmark={toggleBookmark}
              onToggleInProgress={toggleInProgress}
            />
          ) : activePage === '관심 공고' ? (
            <BookmarkPage
              bids={bids}
              bidFlags={bidFlags}
              onToggleBookmark={toggleBookmark}
              onToggleInProgress={toggleInProgress}
              onSelectBid={handleSelectBid}
              selectedBid={selectedBid}
            />
          ) : activePage === '제안목차' ? (
            <ProposalPage
              bids={bids}
              bidFlags={bidFlags}
              outlinesMap={outlinesMap}
              outlineStatusMap={outlineStatusMap}
              aiStatuses={aiStatuses}
              onOpenAnalysisDetail={openAnalysisDetail}
              onRequestOutline={requestOutline}
            />
          ) : activePage === '목차 현황' ? (
            <ProposalOutlinePage
              bids={bids}
              bidFlags={bidFlags}
              outlinesMap={outlinesMap}
              outlineStatusMap={outlineStatusMap}
              onOpenAnalysisDetail={openAnalysisDetail}
              onRequestOutline={requestOutline}
              onDownloadOutline={downloadOutlineExcel}
            />
          ) : activePage === '전략 리포트' ? (
            <StrategyReportPage bids={bids} bidFlags={bidFlags} aiStatuses={aiStatuses} />
          ) : activePage === '진행 프로젝트' ? (
            <ProjectPage
              bids={bids}
              bidFlags={bidFlags}
              aiStatuses={aiStatuses}
              onSelectBid={handleSelectBid}
              selectedBid={selectedBid}
              onToggleBookmark={toggleBookmark}
              onToggleInProgress={toggleInProgress}
              onOpenAnalysisDetail={openAnalysisDetail}
              onRequestAnalysis={requestAnalysis}
              onUpdateManagers={updateBidManagers}
              ceoMode={isCeo}
              currentUser={user}
            />
          ) : activePage === 'LLM 설정' ? (
            <AdminLLMPage />
          ) : activePage === '독소조항 설정' ? (
            <AdminPoisonPage />
          ) : activePage === '시스템 현황' ? (
            <AdminStatusPage dashboardStats={dashboardStats} totalBidCount={bids.length} />
          ) : isAdmin ? (
            <AdminStatusPage dashboardStats={dashboardStats} totalBidCount={bids.length} />
          ) : isCeo ? (
            <>
              <KpiCards bids={inProgressBids} bidsLoading={isFetching} ceoMode={true} aiStatuses={aiStatuses} dashboardStats={dashboardStats} />
              {inProgressBids.length === 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', borderRadius: '10px', backgroundColor: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)' }}>
                  <Info style={{ width: '16px', height: '16px', color: '#7C3AED', flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', color: '#7C3AED' }}>담당자 모드에서 공고에 진행 등록을 하면 이곳에 표시됩니다</span>
                </div>
              )}
              <div className="flex gap-4" style={{ minHeight: '440px' }}>
                <BidTable
                  bids={inProgressBids}
                  isLoading={isFetching}
                  selectedBid={selectedBid}
                  onSelectBid={handleSelectBid}
                  agencySettings={agencySettings}
                  bidFlags={bidFlags}
                  aiStatuses={aiStatuses}
                  ceoMode={true}
                  onRequestAnalysis={requestAnalysis}
                  showBidNumber={true}
                />
                <BidDetailPanel bid={selectedBid} detailLoading={detailLoading} aiStatuses={aiStatuses} onOpenAnalysisDetail={openAnalysisDetail} onRequestAnalysis={requestAnalysis} ceoMode={true} analysisLogs={selectedBid ? analysisLogsMap[selectedBid.id] : undefined} outlineStatus={selectedBid ? outlineStatusMap[selectedBid.id] : 'none'} onRequestOutline={requestOutline} onDownloadOutline={downloadOutlineExcel} bidFlags={bidFlags} onToggleInProgress={toggleInProgress} onUpdateManagers={updateBidManagers} />
              </div>
              <BottomWidgets
                bids={inProgressBids}
                bidFlags={bidFlags}
                aiStatuses={aiStatuses}
                onToggleBookmark={toggleBookmark}
                onToggleInProgress={toggleInProgress}
                onOpenAnalysisDetail={openAnalysisDetail}
                onRequestAnalysis={requestAnalysis}
                ceoMode={true}
                typeStats={typeStats}
              />
            </>
          ) : (
            <>
              <KpiCards bids={bids} bidsLoading={isFetching} ceoMode={false} dashboardStats={dashboardStats} />
              <div style={{ height: '500px', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                <BidListPage
                  bids={bids}
                  bidFlags={bidFlags}
                  aiStatuses={aiStatuses}
                  onToggleBookmark={toggleBookmark}
                  onToggleInProgress={toggleInProgress}
                  onOpenAnalysisDetail={openAnalysisDetail}
                  onRequestAnalysis={requestAnalysis}
                  hideTargetList={true}
                  showBidNumber={true}
                  analysisLogsMap={analysisLogsMap}
                  outlineStatusMap={outlineStatusMap}
                  onRequestOutline={requestOutline}
                  onDownloadOutline={downloadOutlineExcel}
                  onUpdateManagers={updateBidManagers}
                />
              </div>
              <BottomWidgets
                bids={bids}
                bidFlags={bidFlags}
                aiStatuses={aiStatuses}
                onToggleBookmark={toggleBookmark}
                onToggleInProgress={toggleInProgress}
                onOpenAnalysisDetail={openAnalysisDetail}
                onRequestAnalysis={requestAnalysis}
                typeStats={typeStats}
              />
            </>
          )}
        </main>
      </div>

      {showAnalysisDetail && analysisDetailBid && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, overflowY: 'auto', backgroundColor: 'var(--dash-bg)' }}>
          <AnalysisDetailPage
            bid={analysisDetailBid}
            onBack={() => setShowAnalysisDetail(false)}
            aiStatus={aiStatuses[analysisDetailBid.id] ?? analysisDetailBid.aiStatus ?? 'none'}
            onRequestAnalysis={requestAnalysis}
            onDeleteAnalysis={deleteAnalysis}
            analysisLogs={analysisLogsMap[analysisDetailBid.id]}
            outline={outlinesMap[analysisDetailBid.id]}
            outlineStatus={outlineStatusMap[analysisDetailBid.id] ?? 'none'}
            outlineLogs={outlineLogsMap[analysisDetailBid.id]}
            onRequestOutline={requestOutline}
            onRegenerateOutline={regenerateOutline}
            onDownloadOutline={downloadOutlineExcel}
            onUploadAttachment={uploadAttachment}
            bidFlags={bidFlags}
            onToggleInProgress={toggleInProgress}
          />
        </div>
      )}
    </div>
  );
}
