import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import {
  Shield, Compass, Skull, Wrench, Volume2, VolumeX, Plus, Trash2,
  ArrowUp, ArrowDown, Play, CheckSquare, Square, Share2, FileCode,
  Settings, Activity,Clock, AlertTriangle, CheckCircle, Download,
  LogOut, Copy, RefreshCw, Zap, Sliders, Search, X, UploadCloud, Link2,
  GripVertical, Database, Clipboard as ClipboardIcon
} from 'lucide-react';

// ================= TYPES & INTERFACES =================
interface ActionItem {
  id: string; // Dynamic ID to track changes
  name: string;
  color: 'cyan' | 'yellow' | 'red';
  level: number; // 1: Toast alert, 2: Standard Checklist Modal, 3: Fullscreen Locked Modal
  tts: string;
  items: string[];
}

interface Division {
  id: string;
  name: string;
  active: ActionItem[];
  passive: ActionItem[];
}

interface GlobalTimer {
  id: string;
  enabled: boolean;
  name: string;
  intervalMin: number;
  level: number;
  tts: string;
  items: string[];
}

interface AppData {
  divisions: Division[];
  globalTimers: GlobalTimer[];
  library: ActionItem[];
}

interface ToastNotification {
  id: string;
  title: string | null;
  items: string[];
  isTimer?: boolean;
}

// ================= SOUND SYNTHESIZER =================
const playSynthSound = (type: 'click' | 'alarm' | 'success' | 'confirm') => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === 'click') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1000, now);
      gainNode.gain.setValueAtTime(0.04, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'alarm') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(650, now);
      osc.frequency.linearRampToValueAtTime(350, now + 0.25);
      gainNode.gain.setValueAtTime(0.06, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.setValueAtTime(1040, now + 0.1);
      gainNode.gain.setValueAtTime(0.04, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === 'confirm') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.setValueAtTime(800, now + 0.1);
      gainNode.gain.setValueAtTime(0.04, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    }
  } catch (err) {
    // Fail silently under non-interactive iframe contexts
  }
};

const formatCombatTime = (totalSeconds: number): string => {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

// ================= DEFAULT TACTICAL SEED DATA =================
const DEFAULT_APP_DATA: AppData = {
  divisions: [
    {
      id: "div-1",
      name: "第11装甲师 (首线突袭与防空戒击群)",
      active: [
        {
          id: "act-1",
          name: "突击机动展开计划",
          color: "cyan",
          level: 2,
          tts: "突击机动单元已部署。请检查两侧视野与随行伴生防空车。",
          items: [
            "侦察突击小车已在主干道前方树林前哨站提供高位视野",
            "伴生红外地空防空单元位置适度靠后，紧紧跟进第一波装甲",
            "前方防区主建筑群已被己方迫击炮发射的多层深烟覆盖遮蔽"
          ]
        },
        {
          id: "act-2",
          name: "侧翼防线防排拦截部署",
          color: "cyan",
          level: 2,
          tts: "防空伞已覆盖侧翼线路。",
          items: [
            "两台陶式重型反坦克导弹发射器已安全进驻高威胁侧翼森林掩体",
            "步兵雷班正在斜坡高危道口设置反突击排障点",
            "无雷达无反辐射威胁红卫机动防空车在后排死角隐藏"
          ]
        }
      ],
      passive: [
        {
          id: "act-3",
          name: "突发：遭遇重炮强击与空中打击应对",
          color: "red",
          level: 2,
          tts: "侦侧到高空对地火力覆盖！全线立刻熄火、拉出轰击圈。",
          items: [
            "火炮雷达电源立刻手动切断拔除，规避免遭定位辐射弹追猎",
            "主战坦克退出强突序列，拉向两翼附近更安全的厚重茂林中",
            "前哨履带防空车散开阵型，防止聚集扎堆暴毙"
          ]
        },
        {
          id: "act-4",
          name: "⚠️ 严重失误规避：扎堆集体冲锋",
          color: "yellow",
          level: 3,
          tts: "警告，指令出现密集框选，严禁无脑送死。请就地建立扇形警戒。",
          items: [
            "操作员立刻下达 STOP 挂起行动，中断单一线路重叠行军",
            "重盾单元和输出导弹小车分配为3个散开的方向编组，维持反攻斜角",
            "受损坦克自动撤向一线补给卡车，恢复履带性能后再行接入"
          ]
        }
      ]
    },
    {
      id: "div-2",
      name: "第3近卫空中突击群 (高速直升机空头分队)",
      active: [
        {
          id: "act-5",
          name: "直升机突防防区夺取",
          color: "cyan",
          level: 2,
          tts: "突袭直升机编队已经升空，关注警戒范围。",
          items: [
            "两架侦查小羚羊已在前线反斜面巡航搜集红外对空火网位置",
            "重型直升机拉出制导反坦克导弹范围，对地攻击开启射击窗口",
            "空骑突击步兵队已成功在敌方主运兵站后排无声突击着陆"
          ]
        }
      ],
      passive: [
        {
          id: "act-6",
          name: "突发：强力对空导弹伏击",
          color: "red",
          level: 3,
          tts: "地空拦截警报！空中载具一键规避拉升。",
          items: [
            "一键给直升机发出撤离命令，向侧后方高地无障碍处后移",
            "地面轻野火炮进行盲射掩护压制敌方对空隐蔽林带",
            "前沿补给车辆迅速切入补给烟幕拉高隐蔽性"
          ]
        }
      ]
    }
  ],
  globalTimers: [
    {
      id: "timer-1",
      enabled: true,
      name: "视野黑点巡检 (防突袭)",
      intervalMin: 3,
      level: 2,
      tts: "视野例行检查，请维护并补充雷达与警戒点哨兵。",
      items: [
        "检索并确认前方主交叉防线至少有两个斜方向的绝对开阔视野",
        "一号补给前哨和道路右侧斜角灌木中留置有不熄火卡车"
      ]
    }
  ],
  library: [
    {
      id: "lib-1",
      name: "标准防空伞机动展开战略 (通用模板)",
      color: "cyan",
      level: 2,
      tts: "通用防空网展开核对模式启动。",
      items: [
        "重型随行底盘防空开启防区轮询雷达系统",
        "红外无雷达肩抗小队在反坦克死角树坑趴下布防",
        "直升机撤回交火死角脱开对空重火力锁定"
      ]
    },
    {
      id: "lib-2",
      name: "突发：遭遇重炮强击与空中打击应对",
      color: "red",
      level: 2,
      tts: "通用红区空袭避让！关闭雷达，隐蔽拉向两侧散开防区。",
      items: [
        "火炮雷达电源立刻关闭，避免被反辐射导弹定位全歼",
        "地面主力铁骑小队立刻拉出敌反斜面重炮指示红烟圈",
        "开启两翼机动卡车后退，将指挥车辆拉出可能被精确压制的重障碍建筑区"
      ]
    }
  ]
};

const DEFAULT_SETTINGS = {
  ttsOn: true,
  vol: 6,
  rate: 6,
  pitch: 5,
  modalSize: 1, // 0: Compact, 1: Medium, 2: Large, 3: Full Screen
};

export default function App() {
  // ================= SYSTEM LOG STATE =================
  interface SystemLog {
    id: string;
    timestamp: string;
    category: 'INFO' | 'SUCCESS' | 'WARN' | 'DANGER' | 'SYSTEM';
    message: string;
  }

  const [logs, setLogs] = useState<SystemLog[]>(() => {
    const raw = localStorage.getItem('warno_hot_sync_logs');
    if (raw) return JSON.parse(raw);
    const timeStr = new Date().toLocaleTimeString('zh-CN', { hour12: false });
    return [
      {
        id: 'init-code',
        timestamp: timeStr,
        category: 'SYSTEM',
        message: '行动检查单应用已启动。'
      }
    ];
  });

  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [searchLogQuery, setSearchLogQuery] = useState('');

  const addLog = (message: string, category: SystemLog['category'] = 'INFO') => {
    const timeStr = new Date().toLocaleTimeString('zh-CN', { hour12: false });
    const newLog: SystemLog = {
      id: Date.now().toString() + '-' + Math.floor(Math.random() * 1000),
      timestamp: timeStr,
      category,
      message
    };
    setLogs(prev => [newLog, ...prev]);
  };

  useEffect(() => {
    localStorage.setItem('warno_hot_sync_logs', JSON.stringify(logs));
  }, [logs]);

  // ================= STATE MANAGEMENT =================
  const [appData, setAppData] = useState<AppData>(() => {
    const raw = localStorage.getItem('warno_hot_sync_data');
    return raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(DEFAULT_APP_DATA));
  });

  const [settings, setSettings] = useState(() => {
    const raw = localStorage.getItem('warno_hot_sync_settings');
    return raw ? JSON.parse(raw) : { ...DEFAULT_SETTINGS };
  });

  // Current main workspace: 'menu' (Welcome lobby console), 'select' (Select Division), 'editor' (Edit config), 'settings' (Sound config), 'dash' (Simulator Board)
  const [currentView, setCurrentView] = useState<'menu' | 'select' | 'editor' | 'settings' | 'dash'>('menu');
  const [selectedDivIdx, setSelectedDivIdx] = useState<number | null>(null);

  // Editor sub views: 'master' (Div list), 'detail' (Div details), 'timers' (Timers), 'library' (Global library)
  const [editorSubView, setEditorSubView] = useState<'master' | 'detail' | 'timers' | 'library' | 'io'>('master');
  const [editingDivIdx, setEditingDivIdx] = useState<number | null>(null);
  const [importText, setImportText] = useState('');
  const [flashCard, setFlashCard] = useState<{ type: string; idx: number } | null>(null);

  // Search filter engines
  const [searchTermDivs, setSearchTermDivs] = useState(''); // Division Selection list filter
  const [searchTermDashActions, setSearchTermDashActions] = useState(''); // Live Dashboard checklist search
  const [searchTermEditDivs, setSearchTermEditDivs] = useState(''); // Division editor master list search
  const [searchTermLibrary, setSearchTermLibrary] = useState(''); // Global template library search
  const [searchTermTimers, setSearchTermTimers] = useState(''); // Global timers search
  const [searchTermLibPicker, setSearchTermLibPicker] = useState(''); // Action templates picker library search

  // Drag and drop sorting state
  const [draggedState, setDraggedState] = useState<{
    type: 'div' | 'act' | 'item' | 'lib' | 'timer' | 'timerItem' | 'libItem';
    index: number;
    subType?: 'active' | 'passive';
    parentIdx?: number;
  } | null>(null);

  // Popup overlay queues
  const [modalQueue, setModalQueue] = useState<{ title: string; items: string[]; tts: string; level: number; isTimer?: boolean; timestamp?: number }[]>([]);
  const [activeChecklist, setActiveChecklist] = useState<{ title: string; items: { id: number; text: string; done: boolean }[]; level: number; tts: string; isTimer?: boolean } | null>(null);
  const [libPickerOpen, setLibPickerOpen] = useState<'active' | 'passive' | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ msg: string; yesText: string; onConfirm: () => void } | null>(null);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [importDetails, setImportDetails] = useState<{
    type: 'all' | 'div' | 'timers' | 'lib' | 'divsOnly';
    title: string;
    summary: string;
    itemCount: number;
    payload: any;
  } | null>(null);

  // Running simulator state
  const [combatSecs, setCombatSecs] = useState(0);
  const [virtualPing, setVirtualPing] = useState(25);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const activeIntervals = useRef<NodeJS.Timeout[]>([]);

  // ================= LOCAL PERSISTENCE =================
  useEffect(() => {
    localStorage.setItem('warno_hot_sync_data', JSON.stringify(appData));
  }, [appData]);

  useEffect(() => {
    localStorage.setItem('warno_hot_sync_settings', JSON.stringify(settings));
  }, [settings]);

  // Click on screen layout to clear L1 Broadcast toasts (Point 3: clicking on raw screen dismisses them)
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        toasts.length > 0 &&
        target &&
        !target.closest('input') &&
        !target.closest('button') &&
        !target.closest('select') &&
        !target.closest('textarea')
      ) {
        setToasts([]);
      }
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, [toasts]);

  // ================= COMBAT SIMULATION & TICK TIMERS =================
  useEffect(() => {
    if (currentView === 'dash' && selectedDivIdx !== null) {
      // 1-second system clock tick
      const timeTicker = setInterval(() => {
        setCombatSecs(s => s + 1);
        setVirtualPing(p => {
          const delta = Math.floor(Math.random() * 9) - 4;
          const next = p + delta;
          return next < 10 ? 10 : next > 85 ? 85 : next;
        });
      }, 1000);

      // Clear preexisting polling routines and setup new timers
      activeIntervals.current.forEach(clearInterval);
      activeIntervals.current = [];

      appData.globalTimers.forEach(t => {
        if (!t.enabled) return;
        const intervalMs = t.intervalMin * 60000;
        const timerId = setInterval(() => {
          triggerModalCheck(`[全域监控例行检查] ${t.name}`, t.items, t.tts, t.level, true);
        }, intervalMs);
        activeIntervals.current.push(timerId);
      });

      return () => {
        clearInterval(timeTicker);
        activeIntervals.current.forEach(timer => clearInterval(timer));
        activeIntervals.current = [];
      };
    } else {
      setCombatSecs(0);
      activeIntervals.current.forEach(timer => clearInterval(timer));
      activeIntervals.current = [];
    }
  }, [currentView, selectedDivIdx, appData.globalTimers]);

  // FIFO modal display triggers
  useEffect(() => {
    if (!activeChecklist && modalQueue.length > 0) {
      const next = modalQueue[0];
      
      // Aggressive immediate twin-deduplication: clear all same-title tasks waiting in queue
      setModalQueue(prev => prev.slice(1).filter(item => item.title.trim() !== next.title.trim()));

      setActiveChecklist({
        title: next.title,
        items: next.items.map((it, idx) => ({ id: idx, text: it, done: false })),
        level: next.level,
        tts: next.tts,
        isTimer: next.isTimer
      });

      playSynthSound('alarm');
      speakTTS(next.tts);
    }
  }, [modalQueue, activeChecklist]);

  // ================= TTS CORE HANDLERS =================
  const speakTTS = (text: string) => {
    if (!settings.ttsOn || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.volume = settings.vol / 10;
    utterance.rate = 0.6 + (settings.rate / 10) * 1.4;
    utterance.pitch = 0.3 + (settings.pitch / 10) * 1.4;
    window.speechSynthesis.speak(utterance);
  };

  const parseToastContent = (rawMsg: string) => {
    if (rawMsg.includes(' | ')) {
      const colonIndex = rawMsg.indexOf(': ');
      let title = "LV1 舱内语音全区广播";
      let messageBody = rawMsg;
      if (colonIndex !== -1 && colonIndex < rawMsg.indexOf(' | ')) {
        title = rawMsg.substring(0, colonIndex).trim();
        messageBody = rawMsg.substring(colonIndex + 2).trim();
      }
      const items = messageBody.split(' | ').map(item => item.trim()).filter(Boolean);
      return { title, items };
    }
    return { title: "LV1 舱内语音全区广播", items: [rawMsg] };
  };

  const showToast = (msg: string, isTimer?: boolean) => {
    const { title, items } = parseToastContent(msg);
    setToasts(prev => {
      const isDup = prev.some(t => t.title.trim() === title.trim() || t.items.join('|') === items.join('|'));
      if (isDup) {
        addLog(`[防叠拦截] 舱内广播「${title}」已存在挂起，自动拦截防事件堆砌。`, "SYSTEM");
        return prev;
      }
      const newToastId = Date.now().toString() + '-' + Math.floor(Math.random() * 1000000);
      const newToast = { id: newToastId, title, items, isTimer };
      // Ensure there is at most ONE toast popup shown on the screen (no mobile text overlap)
      return [newToast];
    });
  };

  const triggerModalCheck = (title: string, items: string[], tts: string, level: number, isTimer?: boolean) => {
    // 巡检定时任务的精密幂等性控制与防事件堆叠引擎 (外层浅校验)
    const isDuplicate = modalQueue.some(item => item.title.trim() === title.trim()) || 
                        (activeChecklist && activeChecklist.title.trim() === title.trim());
    if (isDuplicate) {
      addLog(`[防叠拦截] 防区「${title}」已被拦截，跳过重复生成以防止终端拥堵。`, "SYSTEM");
      return;
    }

    // 严密队列防叠引擎：在 React batch state 触发时，在 state 变更闭包中执行底层真闭包校验
    setModalQueue(prev => {
      const isQueueDup = prev.some(item => item.title.trim() === title.trim()) || 
                         (activeChecklist && activeChecklist.title.trim() === title.trim());
      if (isQueueDup) {
        addLog(`[列防叠拦截] 重复排查要素「${title}」在挂起事务中拦截，避免同名重叠。`, "SYSTEM");
        return prev;
      }
      
      const newQueue = [...prev, { title, items, tts, level, isTimer, timestamp: Date.now() }];
      
      // 按 重要程度(level) 和 时间顺序(timestamp) 排序
      newQueue.sort((a, b) => {
        if (b.level !== a.level) {
          return b.level - a.level; // Level 3 > Level 2 > Level 1
        }
        return (a.timestamp || 0) - (b.timestamp || 0); // 先触发的排前面
      });
      return newQueue;
    });
  };

  const requestConfirm = (msg: string, yesText: string, onConfirm: () => void) => {
    playSynthSound('click');
    setConfirmModal({ msg, yesText, onConfirm });
  };

  // ================= POLISHED DESIGN STYLE HELPERS =================
  const getModalSizeClass = () => {
    switch (settings.modalSize) {
      case 0: return 'max-w-md';
      case 1: return 'max-w-xl';
      case 2: return 'max-w-3xl animate-flicker-ambient';
      case 3: return 'max-w-full h-full';
      default: return 'max-w-xl';
    }
  };

  const getColorClass = (color: string) => {
    if (color === 'cyan') return 'border-[#00ffff] text-[#00ffff] bg-[rgba(0,255,255,0.02)]';
    if (color === 'yellow') return 'border-[#ffb000] text-[#ffb000] bg-[rgba(255,176,0,0.02)]';
    return 'border-red-500 text-red-500 bg-red-950/10';
  };

  const borderLeftAccent = (color: string) => {
    if (color === 'cyan') return 'border-l-4 border-l-[#00ffff]';
    if (color === 'yellow') return 'border-l-4 border-l-[#ffb000]';
    return 'border-l-4 border-l-red-500';
  };

  // ================= CORE ACTIONS & HANDLERS =================
  const handleStartCombat = (divIdx: number) => {
    setSelectedDivIdx(divIdx);
    setSearchTermDashActions('');
    setCurrentView('dash');
    playSynthSound('success');
    speakTTS(`模拟雷达防御区已启动。正在连接至 ${appData.divisions[divIdx].name}`);
  };

  // Point 5: "退出模拟" straight forward action - no annoying confirm prompts on simply backing
  const handleExitCombat = () => {
    playSynthSound('confirm');
    setCurrentView('select');
    setSelectedDivIdx(null);
    setModalQueue([]);
    setActiveChecklist(null);
    speakTTS("模拟区脱开。连接返回大厅。");
  };

  // ================= MULTI-LEVEL HIGH PERFORMANCE HOT SYNC (Point 6 & 7) =================

  // Overwrites a specific division action item with the general template info matching the action's name
  const syncSingleActionFromTemplate = (divIdx: number, type: 'active' | 'passive', actIdx: number, actionName: string) => {
    const template = appData.library.find(t => t.name.trim() === actionName.trim());
    if (!template) {
      addLog(`对齐匹配失败：战略资料库中未检索到同名公共参考预案「${actionName}」`, "WARN");
      speakTTS(`对齐失败，缺少同名公共预案`);
      playSynthSound('alarm');
      return;
    }

    const nextDivs = [...appData.divisions];
    nextDivs[divIdx][type][actIdx] = {
      ...nextDivs[divIdx][type][actIdx],
      color: template.color,
      level: template.level,
      tts: template.tts,
      items: [...template.items]
    };

    setAppData(prev => ({ ...prev, divisions: nextDivs }));
    playSynthSound('success');
    addLog(`成功自公告模板大纲同步导入并完全覆盖覆装了指令「${actionName}」`, "SUCCESS");
  };

  // Point 7: One-key global overwrite from templates library card to propagate matching commands to all division actions
  const propagateTemplateToAllDivisions = (template: ActionItem) => {
    const nextDivs = JSON.parse(JSON.stringify(appData.divisions)) as Division[];
    let syncCount = 0;

    nextDivs.forEach(div => {
      // Check active actions list
      div.active = div.active.map(act => {
        if (act.name.trim() === template.name.trim()) {
          syncCount++;
          return {
            ...act,
            color: template.color,
            level: template.level,
            tts: template.tts,
            items: [...template.items]
          };
        }
        return act;
      });

      // Check passive actions list
      div.passive = div.passive.map(act => {
        if (act.name.trim() === template.name.trim()) {
          syncCount++;
          return {
            ...act,
            color: template.color,
            level: template.level,
            tts: template.tts,
            items: [...template.items]
          };
        }
        return act;
      });
    });

    if (syncCount === 0) {
      addLog(`广播推演匹配为空：在任何存量战指特遣中未发现匹配同名作战指令「${template.name}」`, "WARN");
      speakTTS(`推送匹配失败，系统未检索到同名节点`);
      playSynthSound('alarm');
      return;
    }

    setAppData(prev => ({ ...prev, divisions: nextDivs }));
    playSynthSound('success');
    addLog(`全新一键全局同步热部署：成功推向下发覆写了 ${syncCount} 处同名战术指令要素！`, "SUCCESS");
    speakTTS(`全局同步热覆写完成，共影响 ${syncCount} 个配置节点`);
  };

  // Point 6: Saves a specific custom division action to the template library directly
  const saveActionToLibrary = (action: ActionItem) => {
    const existsIdx = appData.library.findIndex(item => item.name.trim() === action.name.trim());

    if (existsIdx > -1) {
      requestConfirm(
        `大书库中已存在名为「${action.name}」的公共模板。是否覆盖它以保持同步更新？`,
        "替换库模板",
        () => {
          const nextLib = [...appData.library];
          nextLib[existsIdx] = {
            ...nextLib[existsIdx],
            color: action.color,
            level: action.level,
            tts: action.tts,
            items: [...action.items]
          };
          setAppData(prev => ({ ...prev, library: nextLib }));
          setConfirmModal(null);
          playSynthSound('success');
          addLog(`成功覆写更新战略大书库中的公共模预案「${action.name}」`, "SUCCESS");
        }
      );
    } else {
      const nextLib = [...appData.library, { ...action, id: "lib-" + Date.now() }];
      setAppData(prev => ({ ...prev, library: nextLib }));
      playSynthSound('success');
      addLog(`已成功将「${action.name}」保存为通用对齐战略模板。`, "SUCCESS");
    }
  };

  // ================= DATA MUTATION CONTROLLERS (DIVISIONS) =================
  const updateDivName = (index: number, name: string) => {
    const next = [...appData.divisions];
    next[index].name = name;
    setAppData(p => ({ ...p, divisions: next }));
  };

  const addDivision = () => {
    playSynthSound('click');
    const newDiv: Division = {
      id: "div-" + Date.now(),
      name: `第${appData.divisions.length + 4}机步守卫连团`,
      active: [],
      passive: []
    };
    setAppData(p => ({ ...p, divisions: [...p.divisions, newDiv] }));
    addLog(`全新师配置「${newDiv.name}」设立成功，配置已就位。`, "SUCCESS");
  };

  const deleteDivision = (index: number) => {
    requestConfirm("确定要删除该师及其包含的所有检查清单项吗？", "删除师", () => {
      const divName = appData.divisions[index].name;
      const next = [...appData.divisions];
      next.splice(index, 1);
      setAppData(p => ({ ...p, divisions: next }));
      setConfirmModal(null);
      addLog(`应用配置所设师「${divName}」已被完全删除，并清空所有待勾选状态。`, "WARN");
    });
  };

  const createBlankAction = (divIdx: number, type: 'active' | 'passive') => {
    playSynthSound('click');
    const nextDivs = [...appData.divisions];
    const newAct: ActionItem = {
      id: "act-" + Date.now(),
      name: type === 'active' ? "新增攻坚突防方案" : "突发空中/地空戒御条款",
      color: type === 'active' ? 'cyan' : 'red',
      level: 2,
      tts: "重要清单已触发，请逐个排除防线障碍。",
      items: ["默认核对安全检查项01"]
    };
    nextDivs[divIdx][type].push(newAct);
    setAppData(p => ({ ...p, divisions: nextDivs }));
  };

  const deleteAction = (divIdx: number, type: 'active' | 'passive', actIdx: number) => {
    const nextDivs = [...appData.divisions];
    nextDivs[divIdx][type].splice(actIdx, 1);
    setAppData(p => ({ ...p, divisions: nextDivs }));
    playSynthSound('click');
  };

  const reorderAction = (divIdx: number, type: 'active' | 'passive', actIdx: number, dir: -1 | 1) => {
    const nextDivs = JSON.parse(JSON.stringify(appData.divisions));
    const arr = nextDivs[divIdx][type];
    const targetIdx = actIdx + dir;
    if (targetIdx < 0 || targetIdx >= arr.length) return;

    const temp = arr[actIdx];
    arr[actIdx] = arr[targetIdx];
    arr[targetIdx] = temp;

    setAppData(p => ({ ...p, divisions: nextDivs }));

    setFlashCard({ type, idx: targetIdx });
    setTimeout(() => setFlashCard(null), 1000);
    playSynthSound('click');
  };

  const moveCheckItem = (divIdx: number, type: 'active' | 'passive', actIdx: number, sIdx: number, dir: -1 | 1) => {
    const nextDivs = JSON.parse(JSON.stringify(appData.divisions));
    const items = nextDivs[divIdx][type][actIdx].items;
    const targetIdx = sIdx + dir;
    if (targetIdx < 0 || targetIdx >= items.length) return;

    // Swap items
    const temp = items[sIdx];
    items[sIdx] = items[targetIdx];
    items[targetIdx] = temp;

    setAppData(p => ({ ...p, divisions: nextDivs }));
    playSynthSound('click');
    addLog(`成功调整指令「${nextDivs[divIdx][type][actIdx].name}」下的排查细节条款。`, "INFO");
  };

  const reorderDivision = (idx: number, direction: -1 | 1) => {
    if (idx + direction < 0 || idx + direction >= appData.divisions.length) return;
    const next = [...appData.divisions];
    const temp = next[idx];
    next[idx] = next[idx + direction];
    next[idx + direction] = temp;
    setAppData(p => ({ ...p, divisions: next }));
    playSynthSound('click');
    addLog(`成功调整特遣编制顺序。`, "INFO");
  };

  // ================= DRAG AND DROP HANDLERS (TACTICAL ORDERING SYSTEM) =================
  const handleDragStart = (
    e: React.DragEvent,
    type: 'div' | 'act' | 'item' | 'lib' | 'timer' | 'timerItem' | 'libItem',
    index: number,
    subType?: 'active' | 'passive',
    parentIdx?: number
  ) => {
    e.stopPropagation();
    setDraggedState({ type, index, subType, parentIdx });
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.classList.add('opacity-45');
    // For transparent styling representation on drag shadow
    try {
      e.dataTransfer.setData('text/plain', index.toString());
    } catch (_) {}
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('opacity-45');
    setDraggedState(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (
    e: React.DragEvent,
    targetType: 'div' | 'act' | 'item' | 'lib' | 'timer' | 'timerItem' | 'libItem',
    targetIndex: number,
    targetSubType?: 'active' | 'passive',
    targetParentIdx?: number
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedState) return;
    if (draggedState.type !== targetType) return;

    const nextDivs = [...appData.divisions];

    if (targetType === 'div') {
      const draggedIndex = draggedState.index;
      if (draggedIndex === targetIndex) return;

      const arr = [...appData.divisions];
      const removed = arr.splice(draggedIndex, 1)[0];
      arr.splice(targetIndex, 0, removed);
      setAppData(p => ({ ...p, divisions: arr }));
      addLog(`[拖拽对位] 成功将师「${removed.name}」拖曳对位重排。`, "SUCCESS");
      playSynthSound('confirm');
    } else if (targetType === 'act' && editingDivIdx !== null) {
      const draggedIndex = draggedState.index;
      const subType = draggedState.subType;
      if (subType !== targetSubType) return;
      if (draggedIndex === targetIndex) return;

      const arr = [...nextDivs[editingDivIdx][subType!]];
      const removed = arr.splice(draggedIndex, 1)[0];
      arr.splice(targetIndex, 0, removed);
      nextDivs[editingDivIdx][subType!] = arr;
      setAppData(p => ({ ...p, divisions: nextDivs }));
      addLog(`[拖拽对位] 成功将指令预案「${removed.name}」拖动重新配属。`, "SUCCESS");
      playSynthSound('confirm');
    } else if (targetType === 'item' && editingDivIdx !== null) {
      const draggedIndex = draggedState.index;
      const subType = draggedState.subType;
      const parentIdx = draggedState.parentIdx;

      if (subType !== targetSubType || parentIdx !== targetParentIdx) return;
      if (draggedIndex === targetIndex) return;

      const items = [...nextDivs[editingDivIdx][subType!][parentIdx!].items];
      const removed = items.splice(draggedIndex, 1)[0];
      items.splice(targetIndex, 0, removed);
      nextDivs[editingDivIdx][subType!][parentIdx!].items = items;
      setAppData(p => ({ ...p, divisions: nextDivs }));
      addLog(`[拖拽对位] 排查节点细节「${removed.substring(0, 15)}...」重新定位完毕。`, "SUCCESS");
      playSynthSound('confirm');
    } else if (targetType === 'lib') {
      const draggedIndex = draggedState.index;
      if (draggedIndex === targetIndex) return;

      const arr = [...appData.library];
      const removed = arr.splice(draggedIndex, 1)[0];
      arr.splice(targetIndex, 0, removed);
      setAppData(p => ({ ...p, library: arr }));
      addLog(`[拖拽对位] 成功将公共预案模板重新排位。`, "SUCCESS");
      playSynthSound('confirm');
    } else if (targetType === 'timer') {
      const draggedIndex = draggedState.index;
      if (draggedIndex === targetIndex) return;

      const arr = [...appData.globalTimers];
      const removed = arr.splice(draggedIndex, 1)[0];
      arr.splice(targetIndex, 0, removed);
      setAppData(p => ({ ...p, globalTimers: arr }));
      addLog(`[拖拽对位] 成功将全域巡回定时秒表重新排位。`, "SUCCESS");
      playSynthSound('confirm');
    } else if (targetType === 'timerItem') {
      const draggedIndex = draggedState.index;
      const parentIdx = draggedState.parentIdx;
      if (parentIdx !== targetParentIdx) return;
      if (draggedIndex === targetIndex) return;

      const timers = [...appData.globalTimers];
      const items = [...timers[parentIdx!].items];
      const removed = items.splice(draggedIndex, 1)[0];
      items.splice(targetIndex, 0, removed);
      timers[parentIdx!].items = items;
      setAppData(p => ({ ...p, globalTimers: timers }));
      addLog(`[拖拽对位] 轮询细节节点重新定位完毕。`, "SUCCESS");
      playSynthSound('confirm');
    } else if (targetType === 'libItem') {
      const draggedIndex = draggedState.index;
      const parentIdx = draggedState.parentIdx;
      if (parentIdx !== targetParentIdx) return;
      if (draggedIndex === targetIndex) return;

      const lib = [...appData.library];
      const items = [...lib[parentIdx!].items];
      const removed = items.splice(draggedIndex, 1)[0];
      items.splice(targetIndex, 0, removed);
      lib[parentIdx!].items = items;
      setAppData(p => ({ ...p, library: lib }));
      addLog(`[拖拽对位] 模板细节节点重新定位完毕。`, "SUCCESS");
      playSynthSound('confirm');
    }
  };

  // ================= ONE-CLICK RULE-BASED AUTOMATIC SORTING =================
  const autoSortDivisions = (rule: 'name-asc' | 'name-desc' | 'actions-desc') => {
    const next = [...appData.divisions];
    if (rule === 'name-asc') {
      next.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
    } else if (rule === 'name-desc') {
      next.sort((a, b) => b.name.localeCompare(a.name, 'zh-CN'));
    } else if (rule === 'actions-desc') {
      next.sort((a, b) => (b.active.length + b.passive.length) - (a.active.length + a.passive.length));
    }
    setAppData(p => ({ ...p, divisions: next }));
    addLog(`[一键重排] 师已按照您设定的规则[${rule}]重新排序完成。`, "SUCCESS");
    playSynthSound('success');
  };

  const autoSortActions = (divIdx: number, type: 'active' | 'passive', rule: 'level-desc' | 'level-asc' | 'name-asc' | 'items-desc') => {
    const nextDivs = [...appData.divisions];
    const arr = [...nextDivs[divIdx][type]];
    if (rule === 'level-desc') {
      arr.sort((a, b) => b.level - a.level);
    } else if (rule === 'level-asc') {
      arr.sort((a, b) => a.level - b.level);
    } else if (rule === 'name-asc') {
      arr.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
    } else if (rule === 'items-desc') {
      arr.sort((a, b) => b.items.length - a.items.length);
    }
    nextDivs[divIdx][type] = arr;
    setAppData(p => ({ ...p, divisions: nextDivs }));
    addLog(`[一键重排] 指令集已按规则[${rule}]自动排序完成。`, "SUCCESS");
    playSynthSound('success');
  };

  const autoSortItems = (divIdx: number, type: 'active' | 'passive', actIdx: number, rule: 'name-asc' | 'length-asc' | 'length-desc') => {
    const nextDivs = [...appData.divisions];
    const arr = [...nextDivs[divIdx][type][actIdx].items];
    if (rule === 'name-asc') {
      arr.sort((a, b) => a.localeCompare(b, 'zh-CN'));
    } else if (rule === 'length-asc') {
      arr.sort((a, b) => a.length - b.length);
    } else if (rule === 'length-desc') {
      arr.sort((a, b) => b.length - a.length);
    }
    nextDivs[divIdx][type][actIdx].items = arr;
    setAppData(p => ({ ...p, divisions: nextDivs }));
    addLog(`[一键重排] 指令「${nextDivs[divIdx][type][actIdx].name}」下的排查要点已依规则排序。`, "SUCCESS");
    playSynthSound('success');
  };

  // ================= GENERAL TEMPLATES & TIMERS CONTROLLERS =================
  const addLibraryItem = () => {
    playSynthSound('click');
    const newItem: ActionItem = {
      id: "lib-" + Date.now(),
      name: "新增通用防守阻截战略 (通用模板)",
      color: "cyan",
      level: 2,
      tts: "触发公共方案。请对前排装甲散布方向进行最后一次检查。",
      items: ["检查二线直升机和红外轻高炮的位置是否在侧后部丛林暗处"]
    };
    setAppData(p => ({ ...p, library: [...p.library, newItem] }));
    addLog(`成功起草并设立了新战术通用模板: 「${newItem.name}」`, "SUCCESS");
  };

  const deleteLibraryAction = (libIdx: number) => {
    const actionName = appData.library[libIdx].name;
    const next = [...appData.library];
    next.splice(libIdx, 1);
    setAppData(p => ({ ...p, library: next }));
    playSynthSound('confirm');
    addLog(`对应模板「${actionName}」已被剔除出库。`, "WARN");
  };

  const addGlobalTimer = () => {
    playSynthSound('click');
    const newT: GlobalTimer = {
      id: "timer-" + Date.now(),
      enabled: true,
      name: "防区补给车线补充巡检",
      intervalMin: 4,
      level: 2,
      tts: "补给状态常规检查，防止前方装甲空弹瘫痪。",
      items: [
        "确认一号前沿补给站备货卡车是否正往交火区进发",
        "补充雷达站主反坦小队的后方子弹负荷"
      ]
    };
    setAppData(p => ({ ...p, globalTimers: [...p.globalTimers, newT] }));
    addLog(`成功设立并启动新定时全扫描巡检线: 「${newT.name}」`, "SUCCESS");
  };

  const deleteGlobalTimer = (idx: number) => {
    const timerName = appData.globalTimers[idx].name;
    const next = [...appData.globalTimers];
    next.splice(idx, 1);
    setAppData(p => ({ ...p, globalTimers: next }));
    playSynthSound('confirm');
    addLog(`全域定时核查任务「${timerName}」已完全注销。`, "WARN");
  };

  // ================= HELPER TRIGGERS =================
  const handlePickFromLibrary = (libItem: ActionItem) => {
    if (editingDivIdx === null) return;
    const cloned: ActionItem = JSON.parse(JSON.stringify(libItem));
    cloned.id = "act-imported-" + Date.now();

    const nextDivs = [...appData.divisions];
    const targetListName = libPickerOpen || 'active';
    nextDivs[editingDivIdx][targetListName].push(cloned);
    setAppData(p => ({ ...p, divisions: nextDivs }));

    setLibPickerOpen(null);
    addLog(`成功自公共战备资料大纲中调任并拼接克隆了指令: 「${cloned.name}」`, "SUCCESS");
    playSynthSound('success');
  };

  const handleToggleCheckItem = (itemId: number) => {
    if (!activeChecklist) return;
    playSynthSound('click');
    const updated = activeChecklist.items.map(it => {
      if (it.id === itemId) return { ...it, done: !it.done };
      return it;
    });
    setActiveChecklist({ ...activeChecklist, items: updated });
  };

  const handleResetData = () => {
    requestConfirm("确定要抹除一切战备修改，重置恢复大平原最初的标准出厂镜像吗？", "初始化重装", () => {
      setAppData(JSON.parse(JSON.stringify(DEFAULT_APP_DATA)));
      setSettings({ ...DEFAULT_SETTINGS });
      setConfirmModal(null);
      addLog("系统完成初始化重装，已拉取并覆写大平原最初的标准原始预案镜像。", "SYSTEM");
      playSynthSound('success');
    });
  };

  // ================= REORDER HELPERS FOR GENERAL LIBRARY & GLOBAL TIMERS =================
  const reorderGlobalTimer = (idx: number, dir: -1 | 1) => {
    if (idx + dir < 0 || idx + dir >= appData.globalTimers.length) return;
    const next = [...appData.globalTimers];
    const temp = next[idx];
    next[idx] = next[idx + dir];
    next[idx + dir] = temp;
    setAppData(p => ({ ...p, globalTimers: next }));
    playSynthSound('click');
  };

  const reorderLibraryItem = (idx: number, dir: -1 | 1) => {
    if (idx + dir < 0 || idx + dir >= appData.library.length) return;
    const next = [...appData.library];
    const temp = next[idx];
    next[idx] = next[idx + dir];
    next[idx + dir] = temp;
    setAppData(p => ({ ...p, library: next }));
    playSynthSound('click');
  };

  // ================= BACKPORT EXPORTING MODULES =================
  const handleIdentifyImport = () => {
    const raw = importText.trim();
    if (!raw) return;
    try {
      if (raw.startsWith('WARNO-HOTS-ALL::')) {
        const payload = JSON.parse(decodeURIComponent(atob(raw.substring('WARNO-HOTS-ALL::'.length))));
        if (!payload || !payload.divisions) throw new Error("Invalid format");
        setImportDetails({
          type: 'all',
          title: '完整配置综合数据包 (ALL CORESYSTEM)',
          summary: `包含项：[${payload.divisions?.length || 0}] 个个配置好的师，[${payload.globalTimers?.length || 0}] 个自动循环检查的定时组，[${payload.library?.length || 0}] 条收录好的备忘库检查项。`,
          itemCount: (payload.divisions?.length || 0) + (payload.globalTimers?.length || 0) + (payload.library?.length || 0),
          payload
        });
        playSynthSound('click');
      } else if (raw.startsWith('WARNO-HOTS-DIV::')) {
        const payload = JSON.parse(decodeURIComponent(atob(raw.substring('WARNO-HOTS-DIV::'.length))));
        if (!payload || !payload.name) throw new Error("Invalid format");
        setImportDetails({
          type: 'div',
          title: `单一列表备份：[ ${payload.name} ]`,
          summary: `包含该野战师专属防线：[${payload.active?.length || 0}] 项攻势对决拦截细节，[${payload.passive?.length || 0}] 项被动避险退避条例。`,
          itemCount: 1,
          payload
        });
        playSynthSound('click');
      } else if (raw.startsWith('WARNO-HOTS-TIMERS::')) {
        const payload = JSON.parse(decodeURIComponent(atob(raw.substring('WARNO-HOTS-TIMERS::'.length))));
        if (!Array.isArray(payload)) throw new Error("Invalid format");
        setImportDetails({
          type: 'timers',
          title: '循环播报定时器列表 (TIMERS ONLY)',
          summary: `包含项：[${payload.length || 0}] 条独立全天候高阻线监测轮搜时段。`,
          itemCount: payload.length,
          payload
        });
        playSynthSound('click');
      } else if (raw.startsWith('WARNO-HOTS-DIVSONLY::')) {
        const payload = JSON.parse(decodeURIComponent(atob(raw.substring('WARNO-HOTS-DIVSONLY::'.length))));
        if (!Array.isArray(payload)) throw new Error("Invalid format");
        setImportDetails({
          type: 'divsOnly',
          title: '所有的师配置集合列表数据 (DIVISIONS ONLY)',
          summary: `包含项：[${payload.length || 0}] 个独立主力作战兵团案。`,
          itemCount: payload.length,
          payload
        });
        playSynthSound('click');
      } else if (raw.startsWith('WARNO-HOTS-LIB::')) {
        const payload = JSON.parse(decodeURIComponent(atob(raw.substring('WARNO-HOTS-LIB::'.length))));
        if (!Array.isArray(payload)) throw new Error("Invalid format");
        setImportDetails({
          type: 'lib',
          title: '公用模板库细节及配置汇总 (TEMPLATES ONLY)',
          summary: `包含项：[${payload.length || 0}] 条内置备忘通用对齐预设模板细节。`,
          itemCount: payload.length,
          payload
        });
        playSynthSound('click');
      } else {
        addLog("加密解密反序列化匹配失败：导入密钥解析异常。", "DANGER");
        playSynthSound('alarm');
      }
    } catch {
      addLog("导入代码拼组破损，数据块解析器严重崩溃！", "DANGER");
      playSynthSound('alarm');
    }
  };

  const executeImport = (mode: 'append' | 'overwrite') => {
    if (!importDetails) return;
    const { type, payload } = importDetails;
    try {
      if (type === 'all') {
        if (mode === 'overwrite') {
          setAppData(payload);
          addLog("系统数据导入成功！", "SUCCESS");
        } else {
          setAppData(p => ({
            ...p,
            divisions: [...p.divisions, ...(payload.divisions || [])],
            globalTimers: [...p.globalTimers, ...(payload.globalTimers || [])],
            library: [...p.library, ...(payload.library || [])],
          }));
          addLog("全端配置包部分要素安全合流追加成功！", "SUCCESS");
        }
      } else if (type === 'div') {
        if (mode === 'overwrite') {
          const idx = appData.divisions.findIndex(d => d.name === payload.name);
          if (idx !== -1) {
            const next = [...appData.divisions];
            next[idx] = payload;
            setAppData(p => ({ ...p, divisions: next }));
            addLog(`成功覆盖了同名的师:「${payload.name}」`, "SUCCESS");
          } else {
            setAppData(p => ({ ...p, divisions: [...p.divisions, payload] }));
            addLog(`成功追加了外部导入配置的新师「${payload.name}」`, "SUCCESS");
          }
        } else {
          setAppData(p => ({ ...p, divisions: [...p.divisions, payload] }));
          addLog(`未比对到重名，已独立追加新设特遣师:「${payload.name}」`, "SUCCESS");
        }
      } else if (type === 'divsOnly') {
        if (mode === 'overwrite') {
          setAppData(p => ({ ...p, divisions: payload }));
          addLog("应用中已有的各项师数据被完全清理，新的配置已被写入覆盖成功", "SUCCESS");
        } else {
          setAppData(p => ({ ...p, divisions: [...p.divisions, ...payload] }));
          addLog("大量所属师项目卡要素追加部署并入网！", "SUCCESS");
        }
      } else if (type === 'timers') {
        if (mode === 'overwrite') {
          setAppData(p => ({ ...p, globalTimers: payload }));
          addLog("全域秒表巡回盘线已安全清除并完全覆写载入！", "SUCCESS");
        } else {
          setAppData(p => ({ ...p, globalTimers: [...p.globalTimers, ...payload] }));
          addLog("全新定时巡视时钟集合追加部署并入网！", "SUCCESS");
        }
      } else if (type === 'lib') {
        if (mode === 'overwrite') {
          setAppData(p => ({ ...p, library: payload }));
          addLog("公共战备备用战术通用对齐大纲库已完全覆写热装填！", "SUCCESS");
        } else {
          setAppData(p => ({ ...p, library: [...p.library, ...payload] }));
          addLog("公共战备备用通用战略组件已成功拼集追加！", "SUCCESS");
        }
      }
      setImportText('');
      setImportDetails(null);
      playSynthSound('success');
    } catch {
      addLog("内存读写异常，持久化存取至数据底盘报错。", "DANGER");
      playSynthSound('alarm');
    }
  };

  const copyToClipboardDirect = (text: string, successLog: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        addLog(`[导出成功] ${successLog}，指控密印已直接复制至系统主剪贴板。`, "SUCCESS");
        speakTTS("数据内容已直接注入剪切板");
      })
      .catch(() => {
        // Safe robust fallback downloads text file directly to satisfy automatic backups
        try {
          const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `WARNO-DATA-EXPORT-${Date.now()}.txt`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          addLog(`[备份下载] ${successLog}，剪贴板受限，已自动开启备份转储文本下载！`, "SUCCESS");
          speakTTS("剪贴板受阻，已启用物理文件流下载");
        } catch {
          addLog(`[导出失败] 剪贴板及外置下载接口均被环境封锁。`, "DANGER");
        }
      });
  };

  const triggerExportFull = () => {
    const code = `WARNO-HOTS-ALL::${btoa(encodeURIComponent(JSON.stringify(appData)))}`;
    copyToClipboardDirect(code, "全域终端战备整编合并全案");
    setShareCode(null);
    playSynthSound('success');
  };

  const triggerExportDivisionsOnly = () => {
    const code = `WARNO-HOTS-DIVSONLY::${btoa(encodeURIComponent(JSON.stringify(appData.divisions)))}`;
    copyToClipboardDirect(code, "所属的所有的师的数据");
    setShareCode(null);
    playSynthSound('success');
  };

  const triggerExportTimers = () => {
    const code = `WARNO-HOTS-TIMERS::${btoa(encodeURIComponent(JSON.stringify(appData.globalTimers)))}`;
    copyToClipboardDirect(code, "全域背景监控轮巡秒表全案");
    setShareCode(null);
    playSynthSound('success');
  };

  const triggerExportLib = () => {
    const code = `WARNO-HOTS-LIB::${btoa(encodeURIComponent(JSON.stringify(appData.library)))}`;
    copyToClipboardDirect(code, "公用对齐要素参考模板书库全案");
    setShareCode(null);
    playSynthSound('success');
  };

  const triggerExportSelectedDiv = (idx: number) => {
    const code = `WARNO-HOTS-DIV::${btoa(encodeURIComponent(JSON.stringify(appData.divisions[idx])))}`;
    copyToClipboardDirect(code, `师「${appData.divisions[idx].name}」配置`);
    setShareCode(null);
    playSynthSound('success');
  };

  const handleExportLogsText = () => {
    try {
      playSynthSound('success');
      const textLines = logs.map(l => `[${l.timestamp}] [${l.category}] ${l.message}`).join('\r\n');
      const header = `======================================================================\r\n行动检查单应用 - 日志导出记录\r\n导出时间: ${new Date().toLocaleString('zh-CN')}\r\n======================================================================\r\n\r\n`;
      const blob = new Blob([header + textLines], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `WARNO-TACTICAL-SYSTEM-LOGS-${new Date().toISOString().substring(0, 10)}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      addLog("日志导出成功。", "SUCCESS");
    } catch {
      addLog("日志导出失败。", "DANGER");
    }
  };

  // ================= DYNAMIC FILTERS =================
  const filteredDivs = appData.divisions.filter(d =>
    d.name.toLowerCase().includes(searchTermDivs.toLowerCase())
  );

  return (
    <div className={`min-h-screen relative flex flex-col selection:bg-[#4af626] selection:text-black font-mono select-none crt-lines pb-8 ${
      currentView === 'menu' ? 'bg-black' : 'bg-[#020702] bg-grid'
    }`}>

      {/* ================= HEADER PANEL (Point 1: Polish Clean Labels & Simplified Menu) ================= */}
      {currentView !== 'menu' && (
        <header className="border-b border-[#4af626]/30 px-4 md:px-6 py-4 bg-black/55 shadow-md shadow-emerald-950/20 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div 
          onClick={() => { playSynthSound('click'); setIsLogModalOpen(true); }}
          className="flex items-center bg-black/60 border border-[#4af626]/20 py-2 px-3 gap-3.5 cursor-pointer hover:border-[#4af626]/60 hover:shadow-[0_0_10px_rgba(74,246,38,0.1)] transition-all select-none group max-w-sm md:max-w-md lg:max-w-lg w-full rounded-xs shrink-0"
          title="点击展开日志"
        >
          <div className="flex items-center gap-2.5 shrink-0 border-r border-[#4af626]/15 pr-3">
            <div className="w-5.5 h-5.5 flex items-center justify-center relative bg-emerald-950/30 border border-[#4af626]/30 group-hover:bg-[#4af626]/10 transition-all">
              <Activity className="w-3.5 h-3.5 text-[#4af626]" />
              <span className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-[#ffb000] rounded-full animate-ping" />
            </div>
            <div className="text-left font-mono">
              <div className="text-[9px] text-gray-500 uppercase tracking-wider leading-none">SYSTEM_LOG</div>
              <div className="text-[10px] font-bold text-[#4af626] leading-none mt-1">日志</div>
            </div>
          </div>

          {/* Small scrolling/view area for latest log */}
          <div className="flex-grow min-w-0 flex items-center justify-between gap-2.5">
            {logs.length > 0 ? (
              <div className="font-mono text-[10px] sm:text-xs tracking-wide truncate flex items-center gap-1.5 min-w-0 flex-1">
                <span className="text-gray-500 shrink-0">[{logs[0].timestamp}]</span>
                <span className={`px-1 text-[8px] font-extrabold shrink-0 border uppercase rounded-xs font-mono leading-tight ${
                  logs[0].category === 'SUCCESS' ? 'border-emerald-600/35 text-[#4af626] bg-emerald-950/20' :
                  logs[0].category === 'WARN' ? 'border-[#ffb000]/30 text-[#ffb000] bg-yellow-950/10' :
                  logs[0].category === 'DANGER' ? 'border-red-800/40 text-red-400 bg-red-950/10' :
                  logs[0].category === 'SYSTEM' ? 'border-gray-800 text-gray-300 bg-gray-900/15' :
                  'border-cyan-800 text-[#00ffff] bg-cyan-950/10'
                }`}>{logs[0].category}</span>
                <span className="text-gray-350 group-hover:text-[#4af626] transition-all truncate pr-1 flex-1">{logs[0].message}</span>
              </div>
            ) : (
              <span className="text-gray-600 font-mono text-[10px] sm:text-xs">暂无日志记录</span>
            )}
            <span className="text-[8px] sm:text-[9px] shrink-0 border border-emerald-800 text-[#4af626] group-hover:bg-[#4af626] group-hover:text-black hover:border-transparent px-1.5 py-0.5 tracking-widest font-bold font-mono transition-colors">
              展开({logs.length})
            </span>
          </div>
        </div>

        {/* Clean responsive tabs directly leading to standard views, solving duplicate back/exit points routing issues */}
        {currentView !== 'dash' ? (
          <div className="flex flex-wrap items-center gap-2.5 md:gap-4 self-start sm:self-center">
            <button
              onClick={() => { playSynthSound('click'); setCurrentView('menu'); }}
              className={`px-4 py-2 border text-xs font-bold transition-all duration-200 cursor-pointer hover:bg-[#4af626]/12 hover:scale-[1.02] active:scale-[0.98] ${
                (currentView as string) === 'menu' ? 'bg-[#4af626]/30 border-[#4af626] text-[#4af626] shadow-[0_0_8px_rgba(74,246,38,0.2)]' : 'border-gray-850 text-gray-500 hover:text-[#4af626]/80'
              }`}
            >
              主菜单
            </button>
            <button
              onClick={() => { playSynthSound('click'); setCurrentView('select'); }}
              className={`px-4 py-2 border text-xs font-bold transition-all duration-200 cursor-pointer hover:bg-[#4af626]/12 hover:scale-[1.02] active:scale-[0.98] ${
                currentView === 'select' ? 'bg-[#4af626]/20 border-[#4af626] text-[#4af626]' : 'border-gray-800 text-gray-400 hover:text-[#4af626]/80'
              }`}
            >
              实战面板
            </button>
            <button
              onClick={() => { playSynthSound('click'); setEditorSubView('master'); setCurrentView('editor'); }}
              className={`px-4 py-2 border text-xs font-bold transition-all duration-200 cursor-pointer hover:bg-[#4af626]/12 hover:scale-[1.02] active:scale-[0.98] ${
                currentView === 'editor' ? 'bg-[#ffb000]/20 border-[#ffb000] text-[#ffb000]' : 'border-gray-800 text-gray-400 hover:text-[#ffb000]/85'
              }`}
            >
              配置编辑器
            </button>
            <button
              onClick={() => { playSynthSound('click'); setCurrentView('settings'); }}
              className={`px-4 py-2 border text-xs font-bold transition-all duration-200 cursor-pointer hover:bg-[#4af626]/12 hover:scale-[1.02] active:scale-[0.98] ${
                currentView === 'settings' ? 'bg-[#00ffff]/20 border-[#00ffff] text-[#00ffff]' : 'border-gray-800 text-gray-400 hover:text-[#00ffff]/85'
              }`}
            >
              设置面板
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {/* Direct jump switch dropdown to quickly hot-hop into another division without tedious steps */}
            <div className="hidden md:flex items-center space-x-1 border border-gray-800 bg-black/60 px-2 py-1 text-xs text-gray-400">
              <span className="text-[10px]">快速切换：</span>
              <select
                value={selectedDivIdx !== null ? selectedDivIdx : ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val !== '') handleStartCombat(parseInt(val));
                }}
                className="bg-black text-[#4af626] text-xs border-none focus:outline-none focus:ring-0 cursor-pointer"
              >
                {appData.divisions.map((d, i) => (
                  <option key={d.id} value={i}>{d.name}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleExitCombat}
              className="px-4 py-1.5 border border-red-500 bg-red-950/40 text-red-400 text-xs font-bold uppercase tracking-wider hover:bg-red-500 hover:text-black transition-all cursor-pointer flex items-center space-x-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>退出模拟</span>
            </button>
          </div>
        )}
      </header>
      )}

      {/* ================= MAIN TACTICAL WORKSPACE ================= */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 py-6 flex flex-col justify-start">

        {/* ================= VIEW 0: TACTICAL TERMINAL MAIN MENU (Point 8) ================= */}
        {currentView === 'menu' && (
          <div className="flex-grow flex flex-col items-center justify-center max-w-4xl mx-auto w-full py-12 md:py-24 space-y-16 animate-flicker-ambient select-none">
            {/* Monospace CRT Main Titles */}
            <div className="text-center space-y-4">
              <h1 className="text-6xl md:text-8xl font-black tracking-[0.2em] text-[#4af626] font-mono leading-none drop-shadow-[0_0_12px_rgba(74,246,38,0.45)]">
                WARNO
              </h1>
              <h2 className="text-3xl md:text-5xl font-bold tracking-[0.35em] text-[#4af626]/90 font-mono leading-none">
                T.A.C.T.I.C.S
              </h2>
              <div className="pt-2 text-xs sm:text-sm font-bold tracking-[0.15em] text-[#00ffff] font-mono select-none">
                行动检查单 // V7.0 FINAL
              </div>
            </div>

            {/* Vertically Stacked Interactive Buttons */}
            <div className="w-full max-w-md flex flex-col space-y-5 px-4">
              <button
                onClick={() => { playSynthSound('success'); setCurrentView('select'); }}
                className="w-full py-3 text-center border border-[#4af626] text-[#4af626] hover:bg-[#4af626]/10 text-xs sm:text-sm font-bold tracking-[0.25em] transition-all duration-300 transform hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
              >
                [ 进入实战面板 ]
              </button>

              <button
                onClick={() => { playSynthSound('click'); setEditorSubView('master'); setCurrentView('editor'); }}
                className="w-full py-3 text-center border border-[#ffb000] text-[#ffb000] hover:bg-[#ffb000]/10 text-xs sm:text-sm font-bold tracking-[0.25em] transition-all duration-300 transform hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
              >
                [ 战术配置编辑器 ]
              </button>

              <button
                onClick={() => { playSynthSound('click'); setCurrentView('settings'); }}
                className="w-full py-3 text-center border border-[#00ffff] text-[#00ffff] hover:bg-[#00ffff]/10 text-xs sm:text-sm font-bold tracking-[0.25em] transition-all duration-350 transform hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
              >
                [ 语音与弹窗设置 ]
              </button>
            </div>
          </div>
        )}

        {/* ================= VIEW 1: DIVISION SELECTION WITH DYNAMIC SEARCH (Point 8) ================= */}
        {currentView === 'select' && (
          <div className="flex-grow space-y-6">
            <div className="border border-[#4af626]/30 bg-black/45 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-[#4af626] uppercase tracking-wider">选择师</h2>
                <p className="text-xs text-gray-400 mt-0.5">选择一个已配置的师进入实战面板。</p>
              </div>

              {/* Point 8: Division Search */}
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-emerald-600" />
                <input
                  type="text"
                  placeholder="搜索师名字..."
                  value={searchTermDivs}
                  onChange={(e) => setSearchTermDivs(e.target.value)}
                  className="w-full bg-black border border-emerald-950 px-3 py-2 pl-9 text-xs text-[#4af626] placeholder-[#4af626]/40 focus:outline-none focus:border-[#4af626] focus:ring-1 focus:ring-[#4af626]"
                />
                {searchTermDivs && (
                  <button onClick={() => setSearchTermDivs('')} className="absolute right-2.5 top-2.5 text-gray-500 hover:text-white">✕</button>
                )}
              </div>
            </div>

            {filteredDivs.length === 0 ? (
              <div className="text-center p-12 border border-dashed border-yellow-700/30 bg-yellow-950/5 text-yellow-500">
                <AlertTriangle className="w-10 h-10 mx-auto text-yellow-500 mb-3" />
                <h3 className="font-bold">无匹配结果</h3>
                <p className="text-xs text-gray-500 mt-1">没有找到匹配的师，请到配置编辑器中创建。</p>
                <div className="mt-4 flex justify-center space-x-2">
                  {searchTermDivs && (
                    <button onClick={() => setSearchTermDivs('')} className="px-3 py-1 bg-yellow-950 border border-yellow-800 text-xs">清除搜索</button>
                  )}
                  <button onClick={() => { setEditorSubView('master'); setCurrentView('editor'); }} className="px-3 py-1 border border-yellow-600 text-xs text-yellow-400 hover:bg-yellow-600 hover:text-black">去创建新师</button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredDivs.map((div, originalI) => {
                  // Find back the index of the division in original un-sliced list
                  const exactIdx = appData.divisions.findIndex(d => d.id === div.id);
                  return (
                    <div
                      key={div.id}
                      className="border border-[#4af626]/40 bg-black/35 p-5 flex flex-col justify-between hover:border-[#4af626] transition-all relative group"
                    >
                      <div className="absolute top-4 right-4 w-1.5 h-1.5 rounded-full bg-[#4af626] animate-pulse" />
                      <div>
                        <span className="text-[9px] text-[#00ffff] font-semibold uppercase bg-cyan-950/20 px-1.5 py-0.5 border border-[#00ffff]/20">DIVISION_WARNO_READY</span>
                        <h3 className="text-lg font-bold text-[#4af626] mt-2 mb-3 tracking-wide">{div.name}</h3>

                        <div className="grid grid-cols-2 gap-2 text-xs border-y border-gray-950 py-3 mb-4">
                          <div className="flex items-center space-x-1.5">
                            <Zap className="w-4 h-4 text-[#00ffff]" />
                            <span className="text-gray-400">主动列表:</span>
                            <span className="font-bold text-[#00ffff]">{div.active.length} 项</span>
                          </div>
                          <div className="flex items-center space-x-1.5">
                            <Skull className="w-4 h-4 text-red-400" />
                            <span className="text-gray-400">被动列表:</span>
                            <span className="font-bold text-red-400">{div.passive.length} 项</span>
                          </div>
                        </div>
                      </div>

                      {/* Point 3: Large easily touchable action launch targets on vertical screen */}
                      <button
                        onClick={() => handleStartCombat(exactIdx)}
                        className="w-full py-3.5 bg-[#4af626]/5 border border-[#4af626]/75 text-[#4af626] hover:bg-[#4af626] hover:text-black font-semibold text-xs tracking-wider transition-all uppercase flex items-center justify-center space-x-2 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>进入实战面板</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

        {/* ================= VIEW 2: ACTIVE CONTROL ZONE - SIM Dashboard (Point 8: Direct filters) ================= */}
        {currentView === 'dash' && selectedDivIdx !== null && (
          <div className="flex-grow flex flex-col space-y-4">

            {/* Simulated Live Metadata Cover */}
            <div className="border border-[#4af626]/20 bg-black/60 p-4 flex flex-col md:flex-row items-start md:items-center justify-between text-xs gap-4 relative">
              <div className="flex items-center space-x-3.5">
                <div className="relative flex items-center justify-center w-10 h-10 border border-[#00ffff] bg-[#00ffff]/5">
                  <Shield className="w-5 h-5 text-[#00ffff] animate-pulse" />
                  <div className="absolute inset-x-0 bottom-0 top-0 border border-[#00ffff] animate-ping opacity-10" />
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-widest font-mono">当前监管中的师</div>
                  <div className="font-bold text-[#00ffff] text-sm md:text-base tracking-wide">{appData.divisions[selectedDivIdx].name}</div>
                </div>
              </div>

              {/* Point 8: Live Filter in High Stress simulator dashboard */}
              <div className="relative w-full md:w-64">
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-emerald-700 font-bold" />
                <input
                  type="text"
                  placeholder="搜索检查项目..."
                  value={searchTermDashActions}
                  onChange={(e) => setSearchTermDashActions(e.target.value)}
                  className="w-full bg-[#020702] border border-[#4af626]/30 px-3 py-2 pl-8 text-xs text-[#4af626] placeholder-[#4af626]/30 focus:outline-none focus:border-[#4af626]"
                />
                {searchTermDashActions && (
                  <button onClick={() => setSearchTermDashActions('')} className="absolute right-2.5 top-2 text-gray-500 hover:text-white">✕</button>
                )}
              </div>

              <div className="flex items-center space-x-4 shrink-0 text-right self-end md:self-center">
                <div className="flex items-center space-x-1.5">
                  <Clock className="w-4 h-4 text-[#ffb000]" />
                  <span className="font-mono text-[#ffb000] text-sm uppercase">{formatCombatTime(combatSecs)}</span>
                </div>
                <div className="flex items-center space-x-1.5 border-l border-gray-900 pl-4">
                  <div className="w-2 h-2 rounded-full bg-[#4af626] animate-pulse" />
                  <span className="text-[10px] font-mono text-gray-500 font-bold">连接正常</span>
                </div>
              </div>
            </div>

            {/* Double Segment active/passive lists */}
            {(() => {
              const query = searchTermDashActions.toLowerCase().trim();
              const fActive = appData.divisions[selectedDivIdx].active.filter(act =>
                act.name.toLowerCase().includes(query) || act.items.some(item => item.toLowerCase().includes(query))
              );
              const fPassive = appData.divisions[selectedDivIdx].passive.filter(act =>
                act.name.toLowerCase().includes(query) || act.items.some(item => item.toLowerCase().includes(query))
              );

              return (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">

                  {/* Active attack lists (Cyan) */}
                  <div className="border border-[#00ffff]/40 bg-black/20 p-5 flex flex-col relative rounded-sm">
                    <div className="absolute top-0 right-0 py-0.5 px-2 bg-[#00ffff]/10 border-l border-b border-[#00ffff]/35 text-[#00ffff] font-semibold text-[9px] uppercase tracking-wider font-mono">
                      ACTIVE // 主动检查
                    </div>
                    <h3 className="text-sm font-bold text-[#00ffff] tracking-widest flex items-center space-x-2 border-b border-[#00ffff]/30 pb-2.5 mb-4">
                      <Compass className="w-4 h-4" />
                      <span>==== 主动检查项列表 ====</span>
                    </h3>

                    <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 max-h-[460px]">
                      {fActive.length === 0 ? (
                        <div className="text-center py-10 text-gray-700 text-xs border border-dashed border-cyan-900/20">
                          {query ? "没有匹配的主动列表项目" : "未配置主动列表"}
                        </div>
                      ) : (
                        fActive.map((act) => (
                          <button
                            key={act.id}
                            onClick={() => triggerModalCheck(act.name, act.items, act.tts, act.level)}
                            className="w-full text-left border border-[#00ffff]/45 bg-black/45 hover:border-[#00ffff] hover:bg-cyan-950/10 active:bg-cyan-950/20 p-3.5 transition-all flex items-center justify-between group cursor-pointer"
                          >
                            <div className="space-y-1 pr-3">
                              <h4 className="font-bold text-[#00ffff] text-sm group-hover:underline">{act.name}</h4>
                              <p className="text-[10px] text-gray-400 font-mono flex items-center gap-2">
                                <span>项目数: {act.items.length} 条</span>
                                {act.tts && <span className="text-emerald-800">| TTS语音提示</span>}
                              </p>
                            </div>
                            <div className="flex items-center space-x-2 shrink-0">
                              <span className="text-[9px] px-1 bg-cyan-950 border border-cyan-800 text-[#00ffff] font-bold">
                                LV.{act.level}
                              </span>
                              <span className="w-6 h-6 flex items-center justify-center bg-cyan-950 border border-cyan-700 text-[#00ffff] text-xs font-bold group-hover:scale-105 transition-all">
                                ▶
                              </span>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Passive responding lists (Red/Yellow) */}
                  <div className="border border-red-500/30 bg-black/20 p-5 flex flex-col relative rounded-sm">
                    <div className="absolute top-0 right-0 py-0.5 px-2 bg-red-950/20 border-l border-b border-red-900/30 text-red-400 font-semibold text-[9px] uppercase tracking-wider font-mono">
                      PASSIVE // 被动检查
                    </div>
                    <h3 className="text-sm font-bold text-red-500 tracking-widest flex items-center space-x-2 border-b border-red-950 pb-2.5 mb-4">
                      <Skull className="w-4 h-4" />
                      <span>==== 被动检查项列表 ====</span>
                    </h3>

                    <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 max-h-[460px]">
                      {fPassive.length === 0 ? (
                        <div className="text-center py-10 text-gray-700 text-xs border border-dashed border-red-900/20">
                          {query ? "没有匹配的被动列表项目" : "未配置被动检查"}
                        </div>
                      ) : (
                        fPassive.map((act) => (
                          <button
                            key={act.id}
                            onClick={() => triggerModalCheck(act.name, act.items, act.tts, act.level)}
                            className={`w-full text-left border p-3.5 transition-all flex items-center justify-between group cursor-pointer ${
                              act.color === 'yellow'
                                ? 'border-[#ffb000]/45 bg-[#ffb000]/5 hover:border-[#ffb000] hover:bg-[#ffb000]/10'
                                : 'border-red-500/40 bg-red-950/10 hover:border-red-500 hover:bg-red-500/10'
                            }`}
                          >
                            <div className="space-y-1">
                              <h4 className={`font-bold text-sm group-hover:underline ${
                                act.color === 'yellow' ? 'text-[#ffb000]' : 'text-red-400'
                              }`}>{act.name}</h4>
                              <p className="text-[10px] text-gray-400 font-mono">
                                提示级别: {act.level === 3 ? "立即满屏阻塞" : "仪表弹窗阻塞"} // 项目: {act.items.length}条
                              </p>
                            </div>
                            <div className="flex items-center space-x-2 shrink-0">
                              <span className={`text-[9px] px-1 border font-bold ${
                                act.color === 'yellow' ? 'border-[#ffb000]/40 text-[#ffb000]' : 'border-red-800 text-red-400'
                              }`}>
                                LV.{act.level}
                              </span>
                              <span className={`w-6 h-6 flex items-center justify-center text-xs font-bold border transition-all ${
                                act.color === 'yellow' ? 'border-[#ffb000] text-[#ffb000] bg-yellow-950/20' : 'border-red-500 text-red-400 bg-red-950/30'
                              }`}>
                                ▶
                              </span>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                </div>
              );
            })()}

          </div>
        )}

        {/* ================= VIEW 3: ARMORY CONFIG & DESIGNS ================= */}
        {currentView === 'editor' && (
          <div className="flex-grow space-y-6">
            <div className="border border-[#ffb000]/30 bg-black/45 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-[#ffb000] uppercase tracking-wider flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-[#ffb000]" />
                  <span>配置编辑器</span>
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">在这里你可以编辑师、循环播报和模板库，或者进行数据包导入及导出。</p>
              </div>

              {/* Sub tabs in design house */}
              <div className="flex flex-wrap items-center gap-3 md:gap-4 shrink-0">
                <button
                  onClick={() => { playSynthSound('click'); setEditorSubView('master'); }}
                  className={`px-4 py-2 border text-xs font-bold transition-all duration-200 cursor-pointer hover:scale-[1.01] active:scale-[0.99] ${
                    editorSubView === 'master' ? 'bg-[#ffb000]/25 border-[#ffb000] text-[#ffb000]' : 'border-gray-800 text-gray-400 hover:border-[#ffb000]/50 hover:text-white'
                  }`}
                >
                  师列表 ({appData.divisions.length})
                </button>
                <button
                  onClick={() => { playSynthSound('click'); setEditorSubView('timers'); }}
                  className={`px-4 py-2 border text-xs font-bold transition-all duration-200 cursor-pointer hover:scale-[1.01] active:scale-[0.99] ${
                    editorSubView === 'timers' ? 'bg-[#ffb000]/25 border-[#ffb000] text-[#ffb000]' : 'border-gray-800 text-gray-400 hover:border-[#ffb000]/50 hover:text-white'
                  }`}
                >
                  循环播报 ({appData.globalTimers.length})
                </button>
                <button
                  onClick={() => { playSynthSound('click'); setEditorSubView('library'); }}
                  className={`px-4 py-2 border text-xs font-bold transition-all duration-200 cursor-pointer hover:scale-[1.01] active:scale-[0.99] ${
                    editorSubView === 'library' ? 'bg-[#ffb000]/25 border-[#ffb000] text-[#ffb000]' : 'border-gray-800 text-gray-400 hover:border-[#ffb000]/50 hover:text-white'
                  }`}
                >
                  模板库 ({appData.library.length})
                </button>
                <button
                  onClick={() => { playSynthSound('click'); setEditorSubView('io'); }}
                  className={`px-4 py-2 border text-xs font-bold transition-all duration-200 cursor-pointer hover:scale-[1.01] active:scale-[0.99] ${
                    editorSubView === 'io' ? 'bg-[#00ffff]/25 border-[#00ffff] text-[#00ffff]' : 'border-gray-800 text-gray-400 hover:border-[#00ffff]/50 hover:text-white'
                  }`}
                >
                  数据导入/导出 (IO)
                </button>
              </div>
            </div>

            {/* Sub design 1: Divisions master view */}
            {editorSubView === 'master' && (
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 border border-[#ffb000]/40 rounded bg-yellow-950/5">
                  <div className="text-xs text-yellow-600 flex flex-col md:flex-row md:items-start md:gap-4 gap-2">
                    <span className="mt-1">通过单击并在上方移动来重排卡片排序即可</span>
                    {/* Auto-sort controls */}
                    <div className="flex items-center space-x-1.5 border border-[#ffb000]/50 bg-black/60 px-2 py-1 rounded select-none">
                      <span className="text-[10px] text-[#ffb000]/70 select-none font-bold">按规则一键自动重排:</span>
                      <select 
                        onChange={(e) => {
                          if (e.target.value) {
                            autoSortDivisions(e.target.value as any);
                            e.target.value = ""; // Reset select index
                          }
                        }}
                        defaultValue=""
                        className="bg-black text-[#ffb000] border border-[#ffb000]/30 text-[10px] py-0.5 px-1.5 focus:outline-none cursor-pointer font-mono"
                      >
                        <option value="" disabled>--- 选项 ---</option>
                        <option value="name-asc">A-Z 名称拼音升序</option>
                        <option value="name-desc">Z-A 名称拼音降序</option>
                        <option value="actions-desc">指令条款存量 🔽</option>
                      </select>
                    </div>
                  </div>
                  <button
                    onClick={addDivision}
                    className="shrink-0 px-4 py-2 bg-[#ffb000] text-black hover:bg-[#ffb000]/80 text-xs font-bold tracking-wider uppercase transition-all cursor-pointer"
                  >
                    + 创建新师
                  </button>
                </div>

                <div className="space-y-3">
                  {appData.divisions.map((div, i) => (
                    <motion.div
                      layout
                      transition={{ type: "spring", stiffness: 385, damping: 30 }}
                      key={div.id}
                      {...({
                        draggable: true,
                        onDragStart: (e: any) => handleDragStart(e, 'div', i),
                        onDragEnd: handleDragEnd,
                        onDragOver: handleDragOver,
                        onDrop: (e: any) => handleDrop(e, 'div', i),
                      } as any)}
                      className="border border-[#ffb000]/40 bg-black/45 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 hover:border-[#ffb000] transition-all cursor-grab active:cursor-grabbing hover:bg-black/90 rounded-sm"
                    >
                      <div className="flex items-start space-x-3.5">
                        {/* Drag and Reorder Controls */}
                        <div className="flex flex-col items-center space-y-1 bg-yellow-950/20 px-1 py-1 rounded border border-[#ffb000]/30 select-none" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => reorderDivision(i, -1)}
                            disabled={i === 0}
                            className="p-1 text-gray-500 hover:text-[#ffb000] hover:bg-black/20 active:scale-90 disabled:opacity-20 cursor-pointer"
                            title="向上移动"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <div className="cursor-grab active:cursor-grabbing text-yellow-600/50 hover:text-yellow-400 select-none" title="点击以拖动重排此该师块的位置">
                            <GripVertical className="w-3 h-3" />
                          </div>
                          <button
                            onClick={() => reorderDivision(i, 1)}
                            disabled={i === appData.divisions.length - 1}
                            className="p-1 text-gray-500 hover:text-[#ffb000] hover:bg-black/20 active:scale-90 disabled:opacity-20 cursor-pointer"
                            title="向下移动"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>

                        <div>
                          <h4 className="font-bold text-[#ffb000] text-base">{div.name}</h4>
                          <div className="text-[10px] text-gray-500 mt-1 flex items-center space-x-4">
                            <span>包含的主动项检查点: {div.active.length} 条</span>
                            <span>包含的被动项检查点: {div.passive.length} 条</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => { playSynthSound('click'); setEditingDivIdx(i); setEditorSubView('detail'); }}
                          className="px-3 py-1.5 border border-[#4af626] bg-[#4af626]/5 hover:bg-[#4af626] hover:text-black font-semibold text-xs transition-all cursor-pointer"
                        >
                          编辑列表项
                        </button>
                        <button
                          onClick={() => triggerExportSelectedDiv(i)}
                          className="px-3 py-1.5 border border-cyan-500 hover:bg-cyan-500 hover:text-black font-semibold text-xs transition-all cursor-pointer"
                        >
                          导出数据
                        </button>
                        <button
                          onClick={() => deleteDivision(i)}
                          className="px-3 py-1.5 border border-red-500 text-red-400 hover:bg-red-500 hover:text-black font-semibold text-xs transition-all cursor-pointer"
                        >
                          删除
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Sub design 2: Single Division detail planner (Master-Detail) */}
            {editorSubView === 'detail' && editingDivIdx !== null && (
              <div className="space-y-6">
                <div className="border border-[#ffb000]/50 bg-yellow-950/5 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-center space-x-2 w-full md:max-w-lg">
                    <span className="text-xs font-bold text-[#ffb000] uppercase tracking-wider shrink-0">名称重命名:</span>
                    <input
                      type="text"
                      value={appData.divisions[editingDivIdx].name}
                      onChange={(e) => updateDivName(editingDivIdx, e.target.value)}
                      className="bg-black border border-[#ffb000]/30 px-3 py-2 text-xs text-[#ffb000] focus:outline-none focus:border-[#ffb000] w-full"
                    />
                  </div>
                  <button
                    onClick={() => { playSynthSound('click'); setEditingDivIdx(null); setEditorSubView('master'); }}
                    className="px-4 py-2 border border-[#ffb000] text-[#ffb000] text-xs font-bold hover:bg-[#ffb000]/10 transition-all cursor-pointer"
                  >
                    ← 保存并返回配置
                  </button>
                </div>

                {/* Sub grid detailing active/passive actions of editing division */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                  {/* ACTIVE COMPONENT LIST */}
                  <div className="space-y-4">
                    <div className="border-b border-[#00ffff]/30 pb-2.5 flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <h3 className="text-sm font-bold text-[#00ffff] tracking-widest flex items-center space-x-1.5 uppercase">
                          <Compass className="w-4 h-4 text-[#00ffff]" />
                          <span>主动检查项列表</span>
                        </h3>
                        {/* Auto sort dropdown for Active tactics */}
                        <div className="flex items-center space-x-1">
                          <span className="text-[9px] text-[#00ffff]/55">一键排序:</span>
                          <select 
                            onChange={(e) => {
                              if (e.target.value) {
                                autoSortActions(editingDivIdx, 'active', e.target.value as any);
                                e.target.value = "";
                              }
                            }}
                            defaultValue=""
                            className="bg-black text-[#00ffff] border border-[#00ffff]/30 text-[9px] py-0.5 px-1 focus:outline-none cursor-pointer font-mono"
                          >
                            <option value="" disabled>--- 选择规则 ---</option>
                            <option value="level-desc">提示级别由高到低</option>
                            <option value="level-asc">提示级别由低到高</option>
                            <option value="name-asc">A-Z 名称 A-Z</option>
                            <option value="items-desc">列表项目数最多</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 shrink-0">
                        <button
                          onClick={() => createBlankAction(editingDivIdx, 'active')}
                          className="px-2 py-1 text-[10px] border border-cyan-800 text-[#00ffff] hover:bg-[#00ffff]/10 cursor-pointer"
                        >
                          + 新建项目
                        </button>
                        <button
                          onClick={() => { playSynthSound('click'); setLibPickerOpen('active'); }}
                          className="px-2 py-1 text-[10px] border border-yellow-800 text-[#ffb000] hover:bg-[#ffb000]/10 cursor-pointer"
                        >
                          📥 从模板库引用
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                      {appData.divisions[editingDivIdx].active.length === 0 ? (
                        <div className="text-center py-10 border border-dashed border-gray-900 text-gray-600 text-xs">
                          当前没有主动检查项，你可以新建一个或从模板库引入。
                        </div>
                      ) : (
                        appData.divisions[editingDivIdx].active.map((act, idx) => {
                          const hasSyncTemplate = appData.library.some(lib => lib.name.trim() === act.name.trim());
                          return (
                            <motion.div
                              layout
                              {...({
                                draggable: true,
                                onDragStart: (e: any) => handleDragStart(e, 'act', idx, 'active'),
                                onDragEnd: handleDragEnd,
                                onDragOver: handleDragOver,
                                onDrop: (e: any) => handleDrop(e, 'act', idx, 'active'),
                              } as any)}
                              transition={{ type: "spring", stiffness: 380, damping: 30 }}
                              key={act.id}
                              className={`border bg-black/40 p-4 relative cursor-grab active:cursor-grabbing hover:bg-black/60 rounded-sm ${borderLeftAccent(act.color)} ${
                                flashCard?.type === 'active' && flashCard?.idx === idx
                                  ? 'border-[#00ffff] scale-[1.01]'
                                  : 'border-[#ffb000]/40'
                              }`}
                            >
                              <div className="flex items-start md:items-center justify-between gap-2.5 mb-3" onClick={(e) => e.stopPropagation()}>
                                {/* Drag Handle */}
                                <div className="flex flex-col items-center space-y-1 bg-yellow-950/20 px-1 py-1 rounded border border-[#ffb000]/30 select-none cursor-grab active:cursor-grabbing mr-1 shrink-0">
                                  <button
                                    onClick={() => reorderAction(editingDivIdx, 'active', idx, -1)}
                                    disabled={idx === 0}
                                    className="p-0.5 text-gray-500 hover:text-[#00ffff] hover:bg-black/20 active:scale-90 disabled:opacity-20 cursor-pointer"
                                    title="向上移动"
                                  >
                                    <ArrowUp className="w-3 h-3" />
                                  </button>
                                  <div className="text-gray-600/50 hover:text-[#00ffff]/80" title="拖动可排序">
                                    <GripVertical className="w-3 h-3" />
                                  </div>
                                  <button
                                    onClick={() => reorderAction(editingDivIdx, 'active', idx, 1)}
                                    disabled={idx === appData.divisions[editingDivIdx].active.length - 1}
                                    className="p-0.5 text-gray-500 hover:text-[#00ffff] hover:bg-black/20 active:scale-90 disabled:opacity-20 cursor-pointer"
                                    title="向下移动"
                                  >
                                    <ArrowDown className="w-3 h-3" />
                                  </button>
                                </div>
                                <input
                                  type="text"
                                  value={act.name}
                                  onChange={(e) => {
                                    const next = [...appData.divisions];
                                    next[editingDivIdx].active[idx].name = e.target.value;
                                    setAppData(p => ({ ...p, divisions: next }));
                                  }}
                                  className="bg-black border border-[#ffb000]/40 p-2 text-xs text-[#00ffff] font-bold flex-1 focus:outline-none"
                                  placeholder="检查项名称..."
                                />
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={() => reorderAction(editingDivIdx, 'active', idx, -1)}
                                    disabled={idx === 0}
                                    className="w-6 h-6 flex items-center justify-center border border-gray-800 text-gray-400 hover:border-[#00ffff] hover:text-[#00ffff] hover:bg-[#00ffff]/10 disabled:opacity-20 text-xs cursor-pointer transition-all duration-150 rounded-sm"
                                    title="上移"
                                  >
                                    ▲
                                  </button>
                                  <div className="w-6 h-6 flex items-center justify-center border border-gray-800 text-gray-500 hover:text-cyan-400 cursor-grab active:cursor-grabbing text-xs rounded-sm" title="拖拽此卡片排序">
                                    <GripVertical className="w-3.5 h-3.5" />
                                  </div>
                                  <button
                                    onClick={() => reorderAction(editingDivIdx, 'active', idx, 1)}
                                    disabled={idx === appData.divisions[editingDivIdx].active.length - 1}
                                    className="w-6 h-6 flex items-center justify-center border border-gray-800 text-gray-400 hover:border-[#00ffff] hover:text-[#00ffff] hover:bg-[#00ffff]/10 disabled:opacity-20 text-xs cursor-pointer transition-all duration-150 rounded-sm"
                                    title="下移"
                                  >
                                    ▼
                                  </button>
                                  <button
                                    onClick={() => deleteAction(editingDivIdx, 'active', idx)}
                                    className="w-6 h-6 flex items-center justify-center border border-red-950 text-red-400 hover:bg-red-500 hover:text-black font-semibold text-xs cursor-pointer transition-all duration-150 rounded-sm"
                                    title="删除该项"
                                  >
                                    ×
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3 text-[10px] mb-3" onClick={(e) => e.stopPropagation()}>
                                <div>
                                  <label className="block text-gray-500 mb-0.5">高亮显示颜色</label>
                                  <select
                                    value={act.color}
                                    onChange={(e) => {
                                      const next = [...appData.divisions];
                                      next[editingDivIdx].active[idx].color = e.target.value as any;
                                      setAppData(p => ({ ...p, divisions: next }));
                                    }}
                                    className="w-full bg-black border border-gray-800 p-1 text-[#ffb000] focus:outline-none"
                                  >
                                    <option value="cyan">荧光青</option>
                                    <option value="yellow">黄色</option>
                                    <option value="red">红色</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-gray-500 mb-0.5">提示级别</label>
                                  <select
                                    value={act.level}
                                    onChange={(e) => {
                                      const next = [...appData.divisions];
                                      next[editingDivIdx].active[idx].level = parseInt(e.target.value);
                                      setAppData(p => ({ ...p, divisions: next }));
                                    }}
                                    className="w-full bg-black border border-gray-800 p-1 text-[#ffb000] focus:outline-none"
                                  >
                                    <option value="1">1级 - 轻提示弹窗</option>
                                    <option value="2">2级 - 二次确认弹窗</option>
                                    <option value="3">3级 - 全屏警告锁定</option>
                                  </select>
                                </div>
                              </div>

                              <div className="mb-3 text-[10px]" onClick={(e) => e.stopPropagation()}>
                                <label className="block text-gray-500 mb-0.5">TTS 语音播报文本</label>
                                <input
                                  type="text"
                                  value={act.tts}
                                  onChange={(e) => {
                                    const next = [...appData.divisions];
                                    next[editingDivIdx].active[idx].tts = e.target.value;
                                    setAppData(p => ({ ...p, divisions: next }));
                                  }}
                                  className="w-full bg-black border border-gray-800 p-1.5 text-[#4af626] focus:outline-none"
                                />
                              </div>

                              <div className="space-y-1.5 mt-3 border-t border-gray-950 pt-3">
                                <span className="block text-[10px] font-bold text-[#00ffff]/60">具体的核对项目 (支持拖拽排序):</span>
                                {act.items.map((sub, sIdx) => (
                                  <motion.div
                                    key={`${sub}-${sIdx}-active`}
                                    {...({
                                      draggable: true,
                                      onDragStart: (e: any) => handleDragStart(e, 'item', sIdx, 'active', idx),
                                      onDragEnd: handleDragEnd,
                                      onDragOver: handleDragOver,
                                      onDrop: (e: any) => handleDrop(e, 'item', sIdx, 'active', idx),
                                    } as any)}
                                    className="flex items-center space-x-1.5 bg-[#00ffff]/5 border border-[#00ffff]/40 p-1 rounded-sm text-xs cursor-grab active:cursor-grabbing hover:bg-black/40 hover:border-cyan-800 transition-all group/item"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {/* Action items reorder controls */}
                                    <div className="flex items-center space-x-0.5 shrink-0 select-none">
                                      <button
                                        onClick={() => moveCheckItem(editingDivIdx, 'active', idx, sIdx, -1)}
                                        disabled={sIdx === 0}
                                        className="p-0.5 text-gray-600 hover:text-[#00ffff] disabled:opacity-10 cursor-pointer"
                                        title="上移"
                                      >
                                        <ArrowUp className="w-2.5 h-2.5" />
                                      </button>
                                      <div className="text-cyan-850 hover:text-[#00ffff]/80 cursor-grab active:cursor-grabbing">
                                        <GripVertical className="w-2.5 h-2.5" />
                                      </div>
                                      <button
                                        onClick={() => moveCheckItem(editingDivIdx, 'active', idx, sIdx, 1)}
                                        disabled={sIdx === act.items.length - 1}
                                        className="p-0.5 text-gray-600 hover:text-[#00ffff] disabled:opacity-10 cursor-pointer"
                                        title="下移"
                                      >
                                        <ArrowDown className="w-2.5 h-2.5" />
                                      </button>
                                    </div>

                                    <span className="text-gray-600 text-[10px] shrink-0 font-mono select-none">{sIdx + 1}.</span>
                                    <input
                                      type="text"
                                      value={sub}
                                      onChange={(e) => {
                                        const next = [...appData.divisions];
                                        next[editingDivIdx].active[idx].items[sIdx] = e.target.value;
                                        setAppData(p => ({ ...p, divisions: next }));
                                      }}
                                      className="bg-transparent border-b border-gray-900 focus:border-[#4af626]/65 focus:bg-black/70 text-[#4af626] focus:outline-none flex-1 py-0.5 px-1.5 text-xs font-mono"
                                    />
                                    <button
                                      onClick={() => {
                                        const next = [...appData.divisions];
                                        next[editingDivIdx].active[idx].items.splice(sIdx, 1);
                                        setAppData(p => ({ ...p, divisions: next }));
                                      }}
                                      className="text-red-500/60 hover:text-red-400 font-bold px-1 transition-colors"
                                      title="移除该项目"
                                    >
                                      ×
                                    </button>
                                  </motion.div>
                                ))}

                                <div className="pt-2 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center space-x-2">
                                    <button
                                      onClick={() => {
                                        const next = [...appData.divisions];
                                        next[editingDivIdx].active[idx].items.push("检查细节描述条目");
                                        setAppData(p => ({ ...p, divisions: next }));
                                      }}
                                      className="text-[10px] text-gray-400 hover:text-white hover:underline cursor-pointer font-bold"
                                    >
                                      + 新增检查条目
                                    </button>
                                    <span className="text-gray-800 text-[9px]">|</span>
                                    {/* Sort checklist inside active tactic */}
                                    <button
                                      onClick={() => autoSortItems(editingDivIdx, 'active', idx, 'name-asc')}
                                      className="text-[9px] text-[#00ffff]/55 hover:text-[#00ffff] hover:underline cursor-pointer"
                                      title="对此指令核对清单按字母拼音顺序整理"
                                    >
                                      A-Z排序
                                    </button>
                                  </div>

                                  {/* Sync & Save actions buttons (Point 6 & 7) */}
                                  <div className="flex items-center space-x-2">
                                    {hasSyncTemplate && (
                                      <button
                                        onClick={() => syncSingleActionFromTemplate(editingDivIdx, 'active', idx, act.name)}
                                        className="px-2 py-0.5 bg-green-950 border border-green-700 text-[#4af626] text-[9px] font-bold flex items-center gap-1 cursor-pointer"
                                        title="该项存在于公用大模板库，点击此同步覆盖成和大库相同内容"
                                      >
                                        <RefreshCw className="w-2.5 h-2.5" /> 
                                        <span>从模板更新</span>
                                      </button>
                                    )}
                                    <button
                                      onClick={() => saveActionToLibrary(act)}
                                      className="px-2 py-0.5 bg-cyan-950 border border-cyan-800 text-[#00ffff] text-[9px] font-bold flex items-center gap-1 cursor-pointer"
                                      title="保存为模板"
                                    >
                                      <UploadCloud className="w-2.5 h-2.5" />
                                      <span>保存到模板库</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* PASSIVE RESPONSE COMPONENT LIST */}
                  <div className="space-y-4">
                    <div className="border-b border-red-950 pb-2.5 flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <h3 className="text-sm font-bold text-red-400 tracking-widest flex items-center space-x-1.5 uppercase">
                          <Skull className="w-4 h-4 text-red-400" />
                          <span>被动检查项列表</span>
                        </h3>
                        {/* Auto-sort controls for Passive tactics */}
                        <div className="flex items-center space-x-1">
                          <span className="text-[9px] text-red-400/60">一键排序:</span>
                          <select 
                            onChange={(e) => {
                              if (e.target.value) {
                                autoSortActions(editingDivIdx, 'passive', e.target.value as any);
                                e.target.value = "";
                              }
                            }}
                            defaultValue=""
                            className="bg-black text-red-400 border border-red-950 text-[9px] py-0.5 px-1 focus:outline-none cursor-pointer font-mono"
                          >
                            <option value="" disabled>--- 选择规则 ---</option>
                            <option value="level-desc">提示级别由高到低</option>
                            <option value="level-asc">提示级别由低到高</option>
                            <option value="name-asc">A-Z 名称 A-Z</option>
                            <option value="items-desc">列表项目数最多</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 shrink-0">
                        <button
                          onClick={() => createBlankAction(editingDivIdx, 'passive')}
                          className="px-2 py-1 text-[10px] border border-red-900 text-red-400 hover:bg-red-500/10 cursor-pointer"
                        >
                          + 新建项目
                        </button>
                        <button
                          onClick={() => { playSynthSound('click'); setLibPickerOpen('passive'); }}
                          className="px-2 py-1 text-[10px] border border-yellow-800 text-[#ffb000] hover:bg-[#ffb000]/10 cursor-pointer"
                        >
                          📥 从模板库引用
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                      {appData.divisions[editingDivIdx].passive.length === 0 ? (
                        <div className="text-center py-10 border border-dashed border-gray-900 text-gray-600 text-xs">
                          当前没有被动检查项，你可以新建一个或从模板库引入。
                        </div>
                      ) : (
                        appData.divisions[editingDivIdx].passive.map((act, idx) => {
                          const hasSyncTemplate = appData.library.some(lib => lib.name.trim() === act.name.trim());
                          return (
                            <motion.div
                              layout
                              {...({
                                draggable: true,
                                onDragStart: (e: any) => handleDragStart(e, 'act', idx, 'passive'),
                                onDragEnd: handleDragEnd,
                                onDragOver: handleDragOver,
                                onDrop: (e: any) => handleDrop(e, 'act', idx, 'passive'),
                              } as any)}
                              transition={{ type: "spring", stiffness: 380, damping: 30 }}
                              key={act.id}
                              className={`border bg-black/40 p-4 relative cursor-grab active:cursor-grabbing hover:bg-black/60 rounded-sm ${borderLeftAccent(act.color)} ${
                                flashCard?.type === 'passive' && flashCard?.idx === idx
                                  ? 'border-red-500 scale-[1.01]'
                                  : 'border-[#ffb000]/40'
                              }`}
                            >
                              <div className="flex items-start md:items-center justify-between gap-2.5 mb-3" onClick={(e) => e.stopPropagation()}>
                                {/* Drag Handle */}
                                <div className="flex flex-col items-center space-y-1 bg-red-950/20 px-1 py-1 rounded border border-red-950 select-none cursor-grab active:cursor-grabbing mr-1 shrink-0">
                                  <button
                                    onClick={() => reorderAction(editingDivIdx, 'passive', idx, -1)}
                                    disabled={idx === 0}
                                    className="p-0.5 text-gray-500 hover:text-red-500 hover:bg-black/20 active:scale-90 disabled:opacity-20 cursor-pointer"
                                    title="向上移动"
                                  >
                                    <ArrowUp className="w-3 h-3" />
                                  </button>
                                  <div className="text-gray-600/50 hover:text-red-500/80" title="拖动可排序">
                                    <GripVertical className="w-3 h-3" />
                                  </div>
                                  <button
                                    onClick={() => reorderAction(editingDivIdx, 'passive', idx, 1)}
                                    disabled={idx === appData.divisions[editingDivIdx].passive.length - 1}
                                    className="p-0.5 text-gray-500 hover:text-red-500 hover:bg-black/20 active:scale-90 disabled:opacity-20 cursor-pointer"
                                    title="向下移动"
                                  >
                                    <ArrowDown className="w-3 h-3" />
                                  </button>
                                </div>
                                <input
                                  type="text"
                                  value={act.name}
                                  onChange={(e) => {
                                    const next = [...appData.divisions];
                                    next[editingDivIdx].passive[idx].name = e.target.value;
                                    setAppData(p => ({ ...p, divisions: next }));
                                  }}
                                  className="bg-black border border-[#ffb000]/40 p-2 text-xs text-red-400 font-bold flex-1 focus:outline-none"
                                  placeholder="被动检查项名称..."
                                />
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={() => reorderAction(editingDivIdx, 'passive', idx, -1)}
                                    disabled={idx === 0}
                                    className="w-6 h-6 flex items-center justify-center border border-gray-800 text-gray-400 hover:border-red-500 hover:text-red-400 hover:bg-red-950/20 disabled:opacity-20 text-xs cursor-pointer transition-all duration-150 rounded-sm"
                                    title="上移"
                                  >
                                    ▲
                                  </button>
                                  <div className="w-6 h-6 flex items-center justify-center border border-gray-800 text-gray-500 hover:text-red-400 cursor-grab active:cursor-grabbing text-xs rounded-sm" title="拖拽此卡片排序">
                                    <GripVertical className="w-3.5 h-3.5" />
                                  </div>
                                  <button
                                    onClick={() => reorderAction(editingDivIdx, 'passive', idx, 1)}
                                    disabled={idx === appData.divisions[editingDivIdx].passive.length - 1}
                                    className="w-6 h-6 flex items-center justify-center border border-gray-800 text-gray-400 hover:border-red-500 hover:text-red-400 hover:bg-red-950/20 disabled:opacity-20 text-xs cursor-pointer transition-all duration-150 rounded-sm"
                                    title="下移此意图"
                                  >
                                    ▼
                                  </button>
                                  <button
                                    onClick={() => deleteAction(editingDivIdx, 'passive', idx)}
                                    className="w-6 h-6 flex items-center justify-center border border-red-950 text-red-500 hover:bg-red-500 hover:text-black font-semibold text-xs cursor-pointer transition-all duration-150 rounded-sm"
                                    title="删除该项目"
                                  >
                                    ×
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3 text-[10px] mb-3">
                                <div>
                                  <label className="block text-gray-500 mb-0.5">高亮显示颜色</label>
                                  <select
                                    value={act.color}
                                    onChange={(e) => {
                                      const next = [...appData.divisions];
                                      next[editingDivIdx].passive[idx].color = e.target.value as any;
                                      setAppData(p => ({ ...p, divisions: next }));
                                    }}
                                    className="w-full bg-black border border-gray-800 p-1 text-[#ffb000]"
                                  >
                                    <option value="red">红色</option>
                                    <option value="yellow">黄色</option>
                                    <option value="cyan">荧光青 (常规攻袭)</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-gray-500 mb-0.5">提示级别</label>
                                  <select
                                    value={act.level}
                                    onChange={(e) => {
                                      const next = [...appData.divisions];
                                      next[editingDivIdx].passive[idx].level = parseInt(e.target.value);
                                      setAppData(p => ({ ...p, divisions: next }));
                                    }}
                                    className="w-full bg-black border border-gray-800 p-1 text-[#ffb000]"
                                  >
                                    <option value="1">1级 - 轻提示弹窗</option>
                                    <option value="2">2级 - 二次确认弹窗</option>
                                    <option value="3">3级 - 全屏警告锁定</option>
                                  </select>
                                </div>
                              </div>

                              <div className="mb-3 text-[10px]">
                                <label className="block text-gray-500 mb-0.5">TTS 语音播报文本</label>
                                <input
                                  type="text"
                                  value={act.tts}
                                  onChange={(e) => {
                                    const next = [...appData.divisions];
                                    next[editingDivIdx].passive[idx].tts = e.target.value;
                                    setAppData(p => ({ ...p, divisions: next }));
                                  }}
                                  className="w-full bg-black border border-gray-800 p-1.5 text-red-400 focus:outline-none focus:border-red-500"
                                />
                              </div>

                              <div className="space-y-1.5 mt-3 border-t border-gray-950 pt-3">
                                <span className="block text-[10px] font-bold text-red-400/70">具体的核对项目 (支持拖拽排序):</span>
                                {act.items.map((sub, sIdx) => (
                                  <motion.div
                                    key={`${sub}-${sIdx}-passive`}
                                    {...({
                                      draggable: true,
                                      onDragStart: (e: any) => handleDragStart(e, 'item', sIdx, 'passive', idx),
                                      onDragEnd: handleDragEnd,
                                      onDragOver: handleDragOver,
                                      onDrop: (e: any) => handleDrop(e, 'item', sIdx, 'passive', idx),
                                    } as any)}
                                    className="flex items-center space-x-1.5 bg-red-950/5 border border-red-955/20 p-1 rounded-sm text-xs cursor-grab active:cursor-grabbing hover:bg-black/40 hover:border-red-800 transition-all group/item"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {/* Action items reorder controls */}
                                    <div className="flex items-center space-x-0.5 shrink-0 select-none">
                                      <button
                                        onClick={() => moveCheckItem(editingDivIdx, 'passive', idx, sIdx, -1)}
                                        disabled={sIdx === 0}
                                        className="p-0.5 text-gray-600 hover:text-red-400 disabled:opacity-10 cursor-pointer"
                                        title="上移"
                                      >
                                        <ArrowUp className="w-2.5 h-2.5" />
                                      </button>
                                      <div className="text-red-850 hover:text-red-400 cursor-grab active:cursor-grabbing">
                                        <GripVertical className="w-2.5 h-2.5" />
                                      </div>
                                      <button
                                        onClick={() => moveCheckItem(editingDivIdx, 'passive', idx, sIdx, 1)}
                                        disabled={sIdx === act.items.length - 1}
                                        className="p-0.5 text-gray-600 hover:text-red-400 disabled:opacity-10 cursor-pointer"
                                        title="下移"
                                      >
                                        <ArrowDown className="w-2.5 h-2.5" />
                                      </button>
                                    </div>

                                    <span className="text-gray-605 text-[10px] shrink-0 font-mono select-none">{sIdx + 1}.</span>
                                    <input
                                      type="text"
                                      value={sub}
                                      onChange={(e) => {
                                        const next = [...appData.divisions];
                                        next[editingDivIdx].passive[idx].items[sIdx] = e.target.value;
                                        setAppData(p => ({ ...p, divisions: next }));
                                      }}
                                      className="bg-transparent border-b border-gray-900 focus:border-[#4af626]/65 focus:bg-black/70 text-[#4af626] focus:outline-none flex-1 py-0.5 px-1.5 text-xs font-mono"
                                    />
                                    <button
                                      onClick={() => {
                                        const next = [...appData.divisions];
                                        next[editingDivIdx].passive[idx].items.splice(sIdx, 1);
                                        setAppData(p => ({ ...p, divisions: next }));
                                      }}
                                      className="text-red-500/60 hover:text-red-400 font-bold px-1 transition-colors"
                                      title="移除该项目"
                                    >
                                      ×
                                    </button>
                                  </motion.div>
                                ))}

                                <div className="pt-2 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center space-x-2">
                                    <button
                                      onClick={() => {
                                        const next = [...appData.divisions];
                                        next[editingDivIdx].passive[idx].items.push("危机应对防漏要素描述");
                                        setAppData(p => ({ ...p, divisions: next }));
                                      }}
                                      className="text-[10px] text-gray-400 hover:text-white hover:underline cursor-pointer font-bold"
                                    >
                                      + 新增检查条目
                                    </button>
                                    <span className="text-gray-800 text-[9px]">|</span>
                                    {/* Sort checklist inside passive tactic */}
                                    <button
                                      onClick={() => autoSortItems(editingDivIdx, 'passive', idx, 'name-asc')}
                                      className="text-[9px] text-red-500/60 hover:text-red-400 hover:underline cursor-pointer"
                                      title="对此指令被动核对清单按字母拼音顺序整理"
                                    >
                                      A-Z排序
                                    </button>
                                  </div>

                                  {/* Sync & Save actions buttons */}
                                  <div className="flex items-center space-x-2">
                                    {hasSyncTemplate && (
                                      <button
                                        onClick={() => syncSingleActionFromTemplate(editingDivIdx, 'passive', idx, act.name)}
                                        className="px-2 py-0.5 bg-green-950 border border-green-700 text-[#4af626] text-[9px] font-bold flex items-center gap-1 cursor-pointer"
                                        title="该项存在公用大模板库，点击此同步覆合相同的细节"
                                      >
                                        <RefreshCw className="w-2.5 h-2.5 animate-spin-slow text-[#4af626]" />
                                        <span>从模板更新</span>
                                      </button>
                                    )}
                                    <button
                                      onClick={() => saveActionToLibrary(act)}
                                      className="px-2 py-0.5 bg-red-950 border border-red-900 text-red-400 text-[9px] font-bold flex items-center gap-1 cursor-pointer"
                                      title="保存为模板"
                                    >
                                      <UploadCloud className="w-2.5 h-2.5" />
                                      <span>保存到模板库</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })
                      )}
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* Sub design 3: Timers loops configuration */}
            {editorSubView === 'timers' && (
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 border border-fuchsia-900/40 rounded bg-fuchsia-950/5">
                  <div className="text-xs text-fuchsia-600">
                    循环播报任务：每隔固定的时间将在屏幕上弹出提示，确保检查不被遗漏。
                  </div>
                  <button
                    onClick={addGlobalTimer}
                    className="shrink-0 px-4 py-2 bg-fuchsia-600 text-white hover:bg-fuchsia-500 text-xs font-bold uppercase transition-all cursor-pointer shadow-[0_0_10px_rgba(217,70,239,0.2)]"
                  >
                    + 新建循环播报
                  </button>
                </div>

                <div className="space-y-4">
                  {appData.globalTimers.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-gray-950 text-gray-650 text-xs">
                      当前还没有设置任何循环播报。
                    </div>
                  ) : (
                    appData.globalTimers.map((timer, tIdx) => (
                      <motion.div
                        layout="position"
                        transition={{ type: "spring", stiffness: 385, damping: 30 }}
                        key={timer.id}
                        {...({
                          draggable: true,
                          onDragStart: (e: any) => handleDragStart(e, 'timer', tIdx),
                          onDragEnd: handleDragEnd,
                          onDragOver: handleDragOver,
                          onDrop: (e: any) => handleDrop(e, 'timer', tIdx),
                        } as any)}
                        className="border border-gray-800 bg-black/40 p-4 border-l-4 border-l-fuchsia-500 space-y-3 cursor-grab active:cursor-grabbing hover:bg-black/60 transition-all rounded-sm"
                      >
                        <div className="flex flex-col md:flex-row md:items-start md:items-center justify-between gap-3 text-xs">
                          <div className="flex items-center space-x-2 w-full md:max-w-xl">
                            {/* Drag Handle */}
                            <div className="flex flex-col items-center space-y-1 bg-black/40 px-1 py-1 rounded border border-gray-800 select-none cursor-grab active:cursor-grabbing mr-2" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => reorderGlobalTimer(tIdx, -1)}
                                disabled={tIdx === 0}
                                className="p-0.5 text-gray-500 hover:text-white hover:bg-black/20 active:scale-90 disabled:opacity-20 cursor-pointer"
                                title="向上移动"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>
                              <div className="text-gray-600 hover:text-white" title="拖动可排序">
                                <GripVertical className="w-3 h-3" />
                              </div>
                              <button
                                onClick={() => reorderGlobalTimer(tIdx, 1)}
                                disabled={tIdx === appData.globalTimers.length - 1}
                                className="p-0.5 text-gray-500 hover:text-white hover:bg-black/20 active:scale-90 disabled:opacity-20 cursor-pointer"
                                title="向下移动"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const next = [...appData.globalTimers];
                                next[tIdx] = { ...next[tIdx], enabled: !next[tIdx].enabled };
                                setAppData(p => ({ ...p, globalTimers: next }));
                                playSynthSound('click');
                              }}
                              className={`px-2 py-1.5 text-[10px] font-bold border shrink-0 ${
                                timer.enabled ? 'bg-fuchsia-600 text-white border-fuchsia-500' : 'border-gray-800 text-gray-400 bg-black'
                              }`}
                            >
                              {timer.enabled ? '已启用' : '已禁用'}
                            </button>
                            <input
                              type="text"
                              value={timer.name}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                const nextItems = JSON.parse(JSON.stringify(appData.globalTimers));
                                nextItems[tIdx].name = e.target.value;
                                setAppData(p => ({ ...p, globalTimers: nextItems }));
                              }}
                              className="bg-black border border-[#00ffff]/40 p-2 font-bold text-xs text-[#00ffff] flex-1 focus:outline-none focus:border-[#00ffff] transition-all rounded-xs"
                            />
                          </div>

                          <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                            <span className="text-gray-500">播报间隔 (分钟):</span>
                            <input
                              type="number"
                              value={timer.intervalMin}
                              min={1}
                              onChange={(e) => {
                                const nextItems = JSON.parse(JSON.stringify(appData.globalTimers));
                                nextItems[tIdx].intervalMin = parseInt(e.target.value) || 1;
                                setAppData(p => ({ ...p, globalTimers: nextItems }));
                              }}
                              className="w-12 bg-black border border-[#00ffff]/40 p-1 text-center text-[#00ffff] focus:outline-none focus:border-[#00ffff] rounded-xs font-mono"
                            />
                            
                            <button
                              onClick={() => deleteGlobalTimer(tIdx)}
                              className="p-1 border border-red-950/40 text-red-500 hover:bg-red-500/20 cursor-pointer rounded-xs"
                              title="删除该项目"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-[10px]" onClick={(e) => e.stopPropagation()}>
                          <div>
                            <label className="text-gray-500 mb-0.5 block font-bold">提示级别</label>
                            <select
                              value={timer.level}
                              onChange={(e) => {
                                const nextItems = JSON.parse(JSON.stringify(appData.globalTimers));
                                nextItems[tIdx].level = parseInt(e.target.value);
                                setAppData(p => ({ ...p, globalTimers: nextItems }));
                              }}
                              className="w-full bg-black border border-[#00ffff]/40 p-1.5 text-[#00ffff] focus:outline-none focus:border-[#00ffff] rounded-xs"
                            >
                              <option value="1">1级 - Centered Toast 居中弹窗 (可任意点击解除)</option>
                              <option value="2">2级 - Modal 表盘清单 (须勾对排雷核验)</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-gray-500 mb-0.5 block font-bold">TTS 语音播报文本</label>
                            <input
                              type="text"
                              value={timer.tts}
                              onChange={(e) => {
                                const nextItems = JSON.parse(JSON.stringify(appData.globalTimers));
                                nextItems[tIdx].tts = e.target.value;
                                setAppData(p => ({ ...p, globalTimers: nextItems }));
                              }}
                              className="w-full bg-black border border-[#ffb000]/30 p-1.5 text-[#4af626] focus:outline-none focus:border-[#4af626] rounded-xs"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5 border-t border-gray-950 pt-3">
                          <span className="block text-[10px] text-fuchsia-500/80 font-bold mb-2">具体核对项目 (支持拖拽排序):</span>
                          {timer.items.map((sub, sIdx) => (
                            <motion.div
                              layout="position"
                              key={`${sub}-${sIdx}`}
                              {...({
                                draggable: true,
                                onDragStart: (e: any) => handleDragStart(e, 'timerItem', sIdx, undefined, tIdx),
                                onDragEnd: handleDragEnd,
                                onDragOver: handleDragOver,
                                onDrop: (e: any) => handleDrop(e, 'timerItem', sIdx, undefined, tIdx),
                              } as any)}
                              className="flex items-center space-x-1.5 bg-[#ffb000]/10 border border-[#ffb000]/20 p-1 rounded-sm text-xs cursor-grab active:cursor-grabbing hover:bg-black/60 hover:border-[#ffb000]/40 transition-all group/item"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center space-x-0.5 shrink-0 select-none">
                                <button
                                  onClick={() => {
                                    if (sIdx === 0) return;
                                    const nextItems = JSON.parse(JSON.stringify(appData.globalTimers));
                                    const items = nextItems[tIdx].items;
                                    const temp = items[sIdx];
                                    items[sIdx] = items[sIdx - 1];
                                    items[sIdx - 1] = temp;
                                    setAppData(p => ({ ...p, globalTimers: nextItems }));
                                    playSynthSound('click');
                                  }}
                                  disabled={sIdx === 0}
                                  className="p-0.5 text-gray-600 hover:text-[#ffb000] disabled:opacity-20 cursor-pointer transition-colors"
                                  title="上移"
                                >
                                  <ArrowUp className="w-2.5 h-2.5" />
                                </button>
                                <div className="text-yellow-800 hover:text-[#ffb000] cursor-grab active:cursor-grabbing transition-colors">
                                  <GripVertical className="w-2.5 h-2.5" />
                                </div>
                                <button
                                  onClick={() => {
                                    if (sIdx === timer.items.length - 1) return;
                                    const nextItems = JSON.parse(JSON.stringify(appData.globalTimers));
                                    const items = nextItems[tIdx].items;
                                    const temp = items[sIdx];
                                    items[sIdx] = items[sIdx + 1];
                                    items[sIdx + 1] = temp;
                                    setAppData(p => ({ ...p, globalTimers: nextItems }));
                                    playSynthSound('click');
                                  }}
                                  disabled={sIdx === timer.items.length - 1}
                                  className="p-0.5 text-gray-600 hover:text-[#ffb000] disabled:opacity-20 cursor-pointer transition-colors"
                                  title="下移"
                                >
                                  <ArrowDown className="w-2.5 h-2.5" />
                                </button>
                              </div>
                              <span className="text-gray-600 text-[10px] shrink-0 font-mono select-none pl-1">#{sIdx + 1}</span>
                              <input
                                type="text"
                                value={sub}
                                onChange={(e) => {
                                  const nextItems = JSON.parse(JSON.stringify(appData.globalTimers));
                                  nextItems[tIdx].items[sIdx] = e.target.value;
                                  setAppData(p => ({ ...p, globalTimers: nextItems }));
                                }}
                                className="bg-transparent border-0 text-[#ffb000] focus:outline-none flex-1 text-xs px-1"
                              />
                              <button
                                onClick={() => {
                                  const nextItems = JSON.parse(JSON.stringify(appData.globalTimers));
                                  nextItems[tIdx].items.splice(sIdx, 1);
                                  setAppData(p => ({ ...p, globalTimers: nextItems }));
                                }}
                                className="text-yellow-800 hover:text-red-400 transition-colors font-bold px-1"
                              >
                                ×
                              </button>
                            </motion.div>
                          ))}
                          <div className="pt-2 pl-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => {
                                const nextItems = JSON.parse(JSON.stringify(appData.globalTimers));
                                nextItems[tIdx].items.push("循环播报细节项说明");
                                setAppData(p => ({ ...p, globalTimers: nextItems }));
                              }}
                              className="text-[10px] bg-black text-[#ffb000] border border-[#ffb000]/30 hover:border-[#ffb000] hover:text-white px-2 py-1 cursor-pointer transition-all rounded-xs"
                            >
                              + 添加具体检查细项
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Sub design 4: General Library view */}
            {editorSubView === 'library' && (
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 border border-[#ffb000]/40 rounded bg-yellow-950/5">
                  <div className="text-xs text-yellow-600">
                    这里是公共模板库，保存常用的条目配置，可供各个师直接引用导入。
                  </div>
                  <button
                    onClick={addLibraryItem}
                    className="shrink-0 px-4 py-2 bg-[#ffb000] text-black hover:bg-[#ffb000]/80 text-xs font-bold uppercase transition-all cursor-pointer"
                  >
                    + 新建公共模板
                  </button>
                </div>

                <div className="space-y-4">
                  {appData.library.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-gray-900 text-gray-650 text-xs">
                      当前没有任何公共模板内容。请点击上方按钮创建。
                    </div>
                  ) : (
                    appData.library.map((lib, libIdx) => (
                      <motion.div
                        layout
                        transition={{ type: "spring", stiffness: 385, damping: 30 }}
                        key={lib.id}
                        {...({
                          draggable: true,
                          onDragStart: (e: any) => handleDragStart(e, 'lib', libIdx),
                          onDragEnd: handleDragEnd,
                          onDragOver: handleDragOver,
                          onDrop: (e: any) => handleDrop(e, 'lib', libIdx),
                        } as any)}
                        className={`border bg-black/40 p-4 border-l-4 ${
                          lib.color === 'cyan' ? 'border-l-[#00ffff]' : lib.color === 'red' ? 'border-l-red-500' : 'border-l-[#ffb000]'
                        } space-y-3 cursor-grab active:cursor-grabbing hover:bg-black/60 transition-all rounded-sm`}
                      >
                        <div className="flex flex-col md:flex-row md:items-start md:items-center justify-between gap-3 text-xs">
                          
                          <div className="flex items-center space-x-2 w-full md:max-w-xl">
                            {/* Drag Handle */}
                            <div className="flex flex-col items-center space-y-1 bg-gray-950/20 px-1 py-1 rounded border border-gray-900 select-none cursor-grab active:cursor-grabbing mr-2" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => reorderLibraryItem(libIdx, -1)}
                                disabled={libIdx === 0}
                                className="p-0.5 text-gray-500 hover:text-[#4af626] hover:bg-black/20 active:scale-90 disabled:opacity-20 cursor-pointer"
                                title="向上移动"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>
                              <div className="text-gray-600/50 hover:text-gray-400" title="拖动可排序">
                                <GripVertical className="w-3 h-3" />
                              </div>
                              <button
                                onClick={() => reorderLibraryItem(libIdx, 1)}
                                disabled={libIdx === appData.library.length - 1}
                                className="p-0.5 text-gray-500 hover:text-[#4af626] hover:bg-black/20 active:scale-90 disabled:opacity-20 cursor-pointer"
                                title="向下移动"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>
                            </div>

                            <input
                              type="text"
                              value={lib.name}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                const next = [...appData.library];
                                next[libIdx].name = e.target.value;
                                setAppData(p => ({ ...p, library: next }));
                              }}
                              className="bg-black border border-[#ffb000]/40 p-2 text-xs text-[#ffb000] font-bold flex-1 focus:outline-none"
                              placeholder="公共模板名称..."
                            />
                          </div>

                          <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                            {/* Point 7: Hot sync template to ALL division items of the same name */}
                            <button
                              onClick={() => propagateTemplateToAllDivisions(lib)}
                              className="px-2.5 py-1.5 bg-[#4af626]/10 border border-[#4af626]/60 text-[#4af626] font-bold text-[10px] flex items-center gap-1.5 cursor-pointer hover:bg-[#4af626] hover:text-black transition-all"
                              title="将更改推送到所有的师中对应同名的检查项目"
                            >
                              <Zap className="w-3 h-3 text-[#4af626] animate-pulse" />
                              <span>推送到所有的师</span>
                            </button>

                            <button
                              onClick={() => deleteLibraryAction(libIdx)}
                              className="p-1 border border-red-950 text-red-500 hover:bg-red-500 hover:text-black cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-[10px]">
                          <div>
                            <label className="text-gray-500 block mb-0.5">高亮显示颜色</label>
                            <select
                              value={lib.color}
                              onChange={(e) => {
                                const next = [...appData.library];
                                next[libIdx].color = e.target.value as any;
                                setAppData(p => ({ ...p, library: next }));
                              }}
                              className="w-full bg-black border border-gray-800 p-1 text-[#ffb000]"
                            >
                              <option value="cyan">荧光青 (正常攻攻)</option>
                              <option value="yellow">警备黄 (防区戒严)</option>
                              <option value="red">敌红 (严重危机退避)</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-gray-500 block mb-0.5">被拦截阻塞等阶(Level)</label>
                            <select
                              value={lib.level}
                              onChange={(e) => {
                                const next = [...appData.library];
                                next[libIdx].level = parseInt(e.target.value);
                                setAppData(p => ({ ...p, library: next }));
                              }}
                              className="w-full bg-black border border-gray-800 p-1 text-[#ffb000]"
                            >
                              <option value="1">1级 - 轻提示弹窗</option>
                              <option value="2">2级 - Modal 表盘清单</option>
                              <option value="3">3级 - Full 全幕锁防机能</option>
                            </select>
                          </div>
                        </div>

                        <div className="text-[10px]">
                          <label className="text-gray-500 block mb-0.5">预设 TTS 语音文本</label>
                          <input
                            type="text"
                            value={lib.tts}
                            onChange={(e) => {
                              const next = [...appData.library];
                              next[libIdx].tts = e.target.value;
                              setAppData(p => ({ ...p, library: next }));
                            }}
                            className="w-full bg-black border border-gray-800 p-1.5 text-yellow-500 focus:outline-none focus:border-yellow-600"
                          />
                        </div>

                        <div className="border-t border-gray-950 pt-3 space-y-1.5 text-xs">
                          <span className="block text-[10px] text-[#ffb000]/80 font-bold mb-2">具体核对项目 (支持拖拽排序):</span>
                          {lib.items.map((sub, sIdx) => (
                            <motion.div
                              key={`${sub}-${sIdx}-${Date.now()}`}
                              {...({
                                draggable: true,
                                onDragStart: (e: any) => handleDragStart(e, 'libItem', sIdx, undefined, libIdx),
                                onDragEnd: handleDragEnd,
                                onDragOver: handleDragOver,
                                onDrop: (e: any) => handleDrop(e, 'libItem', sIdx, undefined, libIdx),
                              } as any)}
                              className="flex items-center space-x-1.5 bg-yellow-950/10 border border-[#ffb000]/40 p-1 rounded-sm text-xs cursor-grab active:cursor-grabbing hover:bg-black/60 hover:border-[#ffb000]/50 transition-all group/item"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center space-x-0.5 shrink-0 select-none">
                                <button
                                  onClick={() => {
                                    if (sIdx === 0) return;
                                    const next = [...appData.library];
                                    const temp = next[libIdx].items[sIdx];
                                    next[libIdx].items[sIdx] = next[libIdx].items[sIdx - 1];
                                    next[libIdx].items[sIdx - 1] = temp;
                                    setAppData(p => ({ ...p, library: next }));
                                    playSynthSound('click');
                                  }}
                                  disabled={sIdx === 0}
                                  className="p-0.5 text-gray-600 hover:text-[#ffb000] disabled:opacity-20 cursor-pointer transition-colors"
                                  title="上移"
                                >
                                  <ArrowUp className="w-2.5 h-2.5" />
                                </button>
                                <div className="text-yellow-800 hover:text-[#ffb000] cursor-grab active:cursor-grabbing transition-colors">
                                  <GripVertical className="w-2.5 h-2.5" />
                                </div>
                                <button
                                  onClick={() => {
                                    if (sIdx === lib.items.length - 1) return;
                                    const next = [...appData.library];
                                    const temp = next[libIdx].items[sIdx];
                                    next[libIdx].items[sIdx] = next[libIdx].items[sIdx + 1];
                                    next[libIdx].items[sIdx + 1] = temp;
                                    setAppData(p => ({ ...p, library: next }));
                                    playSynthSound('click');
                                  }}
                                  disabled={sIdx === lib.items.length - 1}
                                  className="p-0.5 text-gray-600 hover:text-[#ffb000] disabled:opacity-20 cursor-pointer transition-colors"
                                  title="下移"
                                >
                                  <ArrowDown className="w-2.5 h-2.5" />
                                </button>
                              </div>
                              <span className="text-gray-650 text-[10px] font-mono shrink-0 select-none pl-1">#{sIdx + 1}</span>
                              <input
                                type="text"
                                value={sub}
                                onChange={(e) => {
                                  const next = [...appData.library];
                                  next[libIdx].items[sIdx] = e.target.value;
                                  setAppData(p => ({ ...p, library: next }));
                                }}
                                className="bg-transparent border-0 text-[#ffb000] focus:outline-none flex-1 text-xs px-1"
                              />
                              <button
                                onClick={() => {
                                  const next = [...appData.library];
                                  next[libIdx].items.splice(sIdx, 1);
                                  setAppData(p => ({ ...p, library: next }));
                                }}
                                className="text-yellow-600 hover:text-red-400 font-bold px-1 transition-colors"
                              >
                                ×
                              </button>
                            </motion.div>
                          ))}
                          <div className="pt-2 pl-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => {
                                const next = [...appData.library];
                                next[libIdx].items.push("公共模板具体项目细项");
                                setAppData(p => ({ ...p, library: next }));
                              }}
                              className="text-[10px] bg-yellow-950/30 text-[#ffb000] border border-yellow-900/50 hover:bg-yellow-900/50 hover:text-white px-2 py-1 cursor-pointer transition-all rounded-xs"
                            >
                              + 添加核对细分条款
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Sub design 5: Data sync io page */}
            {editorSubView === 'io' && (
              <div id="database_sync_box" className="border-2 border-[#00ffff]/30 bg-black/60 p-5 mt-2 space-y-6">
                <div>
                  <h3 className="text-base font-bold text-[#00ffff] tracking-wider uppercase border-b border-[#00ffff]/20 pb-3 flex items-center space-x-2">
                    <Database className="w-5 h-5" />
                    <span>数据导入导出 (IO)</span>
                  </h3>
                  <p className="text-xs text-gray-400 leading-relaxed mt-2">
                    这里可以导入或导出配置数据。在下方文本框中粘贴数据进行导入。
                  </p>
                </div>
                
                <div className="space-y-2 border border-[#00ffff]/50 p-4 bg-cyan-950/10">
                  <div className="flex items-center justify-between mb-1">
                     <span className="text-xs text-[#00ffff]/80 font-bold">▶ 信道导入密文框:</span>
                  </div>
                  <textarea
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder="物理粘贴 WARNO-HOTS-:: 系列前缀开头的阵地代码..."
                    className="w-full h-32 bg-black border-2 border-[#00ffff]/30 p-3 text-xs text-[#00ffff] focus:outline-none focus:border-[#00ffff] font-mono shadow-inner shadow-[#00ffff]/5 transition-all"
                  />
                  <div className="pt-2">
                    <button
                      onClick={handleIdentifyImport}
                      disabled={!importText.trim()}
                      className="w-full sm:w-auto px-6 py-2.5 bg-[#00ffff] text-black disabled:opacity-30 disabled:pointer-events-none hover:bg-[#00ffff]/80 text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-2 shadow-[0_0_10px_rgba(0,255,255,0.3)]"
                    >
                      <Download className="w-4 h-4" />
                      <span>立即导入并提取数据</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-[#00ffff]/10">
                   <h4 className="text-xs text-gray-500 font-bold mb-2">▶ 本机终端全域系统外发流出 (导出数据)</h4>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        onClick={triggerExportFull}
                        className="px-4 py-3 bg-black border border-[#00ffff]/60 text-[#00ffff] hover:bg-[#00ffff]/15 text-xs font-bold transition-all cursor-pointer flex flex-col justify-center items-start group"
                      >
                         <span className="group-hover:translate-x-1 transition-transform">1. 导出【全部配置】数据包</span>
                         <span className="text-[9px] text-[#00ffff]/40 font-normal mt-1 leading-snug">包含所有的师配置、循环播报和模板库数据。</span>
                      </button>
                      <button
                        onClick={triggerExportDivisionsOnly}
                        className="px-4 py-3 bg-black border border-[#4af626]/60 text-[#4af626] hover:bg-[#4af626]/15 text-xs font-bold transition-all cursor-pointer flex flex-col justify-center items-start group"
                      >
                         <span className="group-hover:translate-x-1 transition-transform">2. 仅导出【所有的师】数据包</span>
                         <span className="text-[9px] text-[#4af626]/40 font-normal mt-1 leading-snug">仅导出各师配置数据，不包含循环播报和模板库的数据包。</span>
                      </button>
                      <button
                        onClick={triggerExportTimers}
                        className="px-4 py-3 bg-black border border-fuchsia-500/60 text-fuchsia-400 hover:bg-fuchsia-950/25 text-xs font-bold transition-all cursor-pointer flex flex-col justify-center items-start group"
                      >
                         <span className="group-hover:translate-x-1 transition-transform">3. 仅导出【循环播报】数据包</span>
                         <span className="text-[9px] text-fuchsia-500/40 font-normal mt-1 leading-snug">只导出自动循环播报相关的数据包。</span>
                      </button>
                      <button
                        onClick={triggerExportLib}
                        className="px-4 py-3 bg-black border border-[#ffb000]/60 text-[#ffb000] hover:bg-[#ffb000]/15 text-xs font-bold transition-all cursor-pointer flex flex-col justify-center items-start group"
                      >
                         <span className="group-hover:translate-x-1 transition-transform">4. 仅导出【公共模板库】数据包</span>
                         <span className="text-[9px] text-[#ffb000]/40 font-normal mt-1 leading-snug">只导出配置主界面中左侧模板库的所有数据包。</span>
                      </button>
                   </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= VIEW 4: MASTER SOUND SETTINGS ================= */}
        {currentView === 'settings' && (
          <div className="flex-grow space-y-6 max-w-2xl mx-auto w-full text-left col">
            <div className="border border-[#00ffff]/30 bg-cyan-950/5 p-6 select-none border-2 border-[#00ffff]/40 bg-black/95 rounded-xs shadow-[0_0_20px_rgba(0,255,255,0.15)]">
              <h2 className="text-base font-black text-[#00ffff] uppercase tracking-widest flex items-center space-x-3 mb-4 border-b border-[#00ffff]/20 pb-2">
                <Sliders className="w-5 h-5 text-[#00ffff] animate-pulse" />
                <span>全局提示与应用偏好设置</span>
              </h2>
              
              <div className="space-y-6 text-xs text-left">
                {/* Section 1: TTS Settings */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-900 pb-2">
                    <span className="text-xs font-bold text-gray-300">⚡ 文字转语音提示设置 (TTS)</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.ttsOn}
                        onChange={(e) => {
                          setSettings(prev => ({ ...prev, ttsOn: e.target.checked }));
                          playSynthSound('click');
                          if (e.target.checked) {
                            setTimeout(() => speakTTS("战术合成语言广播系统已挂稳上电。"), 50);
                          }
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-850 rounded-full peer peer-focus:ring-2 peer-focus:ring-[#00ffff]/25 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-gray-400 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:bg-[#00ffff] peer-checked:bg-[#00ffff]/20 peer-checked:border peer-checked:border-[#00ffff]/40"></div>
                    </label>
                  </div>

                  {settings.ttsOn && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-black/40 p-4 border border-gray-900 rounded-xs font-mono">
                      {/* Volume Slider */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[11px] font-mono">
                          <span className="text-gray-400">音量</span>
                          <span className="text-[#00ffff] font-bold">{settings.vol}</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="10"
                          value={settings.vol}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            setSettings(prev => ({ ...prev, vol: val }));
                          }}
                          className="w-full accent-[#00ffff] bg-gray-850 h-1.5 rounded-lg cursor-pointer"
                        />
                      </div>

                      {/* Speed Rate Slider */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[11px] font-mono">
                          <span className="text-gray-400">语速</span>
                          <span className="text-[#00ffff] font-bold">{settings.rate}</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={settings.rate}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            setSettings(prev => ({ ...prev, rate: val }));
                          }}
                          className="w-full accent-[#00ffff] bg-gray-850 h-1.5 rounded-lg cursor-pointer"
                        />
                      </div>

                      {/* Pitch Slider */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[11px] font-mono">
                          <span className="text-gray-400">声调音高</span>
                          <span className="text-[#00ffff] font-bold">{settings.pitch}</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={settings.pitch}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            setSettings(prev => ({ ...prev, pitch: val }));
                          }}
                          className="w-full accent-[#00ffff] bg-gray-850 h-1.5 rounded-lg cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Section 2: Modal Dimensions */}
                <div className="space-y-3">
                  <div className="border-b border-gray-900 pb-2">
                    <span className="text-xs font-bold text-gray-300">📐 提示弹窗确认框大小</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { l: '小 (Compact)', v: 0 },
                      { l: '中 (Medium)', v: 1 },
                      { l: '大 (Large)', v: 2 },
                      { l: '全屏 (Fullscreen)', v: 3 }
                    ].map((sizes) => (
                      <button
                        key={sizes.v}
                        onClick={() => {
                          setSettings(prev => ({ ...prev, modalSize: sizes.v }));
                          playSynthSound('click');
                          addLog(`排核视窗规格已设定为 ${sizes.l.split(' ')[0]} 模式。`, "INFO");
                        }}
                        className={`py-2 px-1 text-[10px] sm:text-xs font-bold font-mono transition-all border rounded-xs cursor-pointer ${
                          settings.modalSize === sizes.v
                            ? 'bg-[#00ffff]/20 border-[#00ffff] text-[#00ffff] shadow-[0_0_10px_rgba(0,255,255,0.15)]'
                            : 'border-gray-850 bg-black/40 text-gray-400 hover:border-[#00ffff]/30 hover:text-[#00ffff]/80'
                        }`}
                      >
                        {sizes.l}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Section 3: Audio Tests & Reset */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 font-mono">
                  <div className="space-y-2 border border-blue-950/25 bg-blue-950/5 p-3 rounded-xs text-left">
                    <span className="text-[11px] font-bold text-gray-400 block font-mono">🔊 提示音效果测试</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => { playSynthSound('click'); speakTTS("排雷点击音效。"); }}
                        className="py-1.5 border border-gray-800 text-[10px] text-gray-300 hover:bg-gray-850 text-center font-mono rounded-xs cursor-pointer"
                      >
                        点击音效
                      </button>
                      <button
                        onClick={() => { playSynthSound('alarm'); speakTTS("雷区警报、遭遇轰击！"); }}
                        className="py-1.5 border border-red-950/40 text-[10px] text-red-550 hover:bg-red-950/15 text-center font-mono rounded-xs cursor-pointer"
                      >
                        警报音效
                      </button>
                      <button
                        onClick={() => { playSynthSound('success'); speakTTS("要素安全、核准释放。"); }}
                        className="py-1.5 border border-emerald-950/40 text-[10px] text-emerald-550 hover:bg-emerald-950/15 text-center font-mono rounded-xs cursor-pointer"
                      >
                        成功音效
                      </button>
                      <button
                        onClick={() => { playSynthSound('confirm'); speakTTS("操作复核、准备加载。"); }}
                        className="py-1.5 border border-[#00ffff]/40 text-[10px] text-cyan-550 hover:bg-cyan-950/15 text-center font-mono rounded-xs cursor-pointer"
                      >
                        确认及退出音频
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 border border-red-950/25 bg-red-950/5 p-3 rounded-xs flex flex-col justify-between text-left">
                    <div>
                      <span className="text-[11px] font-bold text-gray-400 block font-mono">⚠️ 恢复系统出厂设置</span>
                      <p className="text-[10px] text-gray-500 leading-normal mt-1">
                        彻底清除所有现在的各项配置项数据并恢复至最初的示例。
                      </p>
                    </div>
                    <button
                      onClick={handleResetData}
                      className="w-full py-2 bg-red-950/25 border border-red-650/50 hover:bg-red-550 hover:text-black transition-all text-xs text-red-400 font-bold rounded-xs cursor-pointer"
                    >
                      [ 删除本地数据并重装示例 ]
                    </button>
                  </div>
                </div>

                {/* Section 4: Return control */}
                <div className="pt-4 border-t border-[#00ffff]/15 flex justify-end">
                  <button
                    onClick={() => {
                      playSynthSound('click');
                      setCurrentView('menu');
                      addLog("脱开终端规格设定，返回大本营指挥舱。", "INFO");
                      speakTTS("设置保存成功，已返回防空指控大厅");
                    }}
                    className="py-3 px-8 bg-cyan-950/20 border-2 border-[#00ffff] text-[#00ffff] font-extrabold text-xs tracking-wider uppercase hover:bg-[#00ffff] hover:text-black transition-all shadow-[0_0_15px_rgba(0,255,255,0.15)] rounded-xs cursor-pointer"
                  >
                    🚀 [ 保存设置并返回配置页 ]
                  </button>
                </div>

              </div>
            </div>
          </div>
        )}
      </main>

        {/* ================= MODAL L1: DIRECT ACTIVE CONTROL CHECKLIST OVERLAY ================= */}
        {activeChecklist !== null && (
          activeChecklist.level === 1 ? (
             <div className="fixed inset-x-0 bottom-4 sm:top-6 sm:bottom-auto z-[450] flex flex-col items-center pointer-events-none select-none max-h-[75vh] overflow-y-auto">
               <div className="w-full max-w-md sm:max-w-xl flex flex-col gap-2.5 px-4 pointer-events-auto">
                 <div
                   onClick={() => {
                     playSynthSound('click');
                     setActiveChecklist(null);
                   }}
                   className={`relative border-2 ${activeChecklist.isTimer ? "border-fuchsia-500 shadow-[0_0_15px_rgba(217,70,239,0.25)]" : "border-[#ffb000] shadow-[0_0_15px_rgba(255,176,0,0.25)]"} bg-black/95 p-3.5 select-none animate-flicker-ambient cursor-pointer hover:border-white transition-all rounded-xs`}
                   title="点击快速关闭"
                 >
                   {/* Warning Hazard Stripes */}
                   <div className="absolute top-0 left-0 right-0 h-1 select-none" style={{
                     backgroundImage: activeChecklist.isTimer
                       ? 'repeating-linear-gradient(45deg, #d946ef, #d946ef 6px, #000 6px, #000 12px)'
                       : 'repeating-linear-gradient(45deg, #ffb000, #ffb000 6px, #000 6px, #000 12px)'
                   }} />

                   {/* Header details */}
                   <div className="flex items-center justify-between gap-2 mt-1">
                     <div className="flex items-center space-x-2 shrink-0 min-w-0">
                       <div className={`w-6 h-6 rounded-xs border flex items-center justify-center bg-black shrink-0 ${activeChecklist.isTimer ? 'border-fuchsia-500 text-fuchsia-400' : 'border-[#ffb000] text-[#ffb000]'}`}>
                         <Clock className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} />
                       </div>
                       <div className="min-w-0 truncate">
                         <h4 className={`text-[10px] font-bold tracking-widest uppercase truncate ${activeChecklist.isTimer ? 'text-fuchsia-400' : 'text-[#ffb000]'}`}>
                           {activeChecklist.title || "LV1 BROADCAST"}
                         </h4>
                       </div>
                     </div>
                     <div className="flex items-center gap-2 shrink-0">
                       <div className="text-[10px] font-mono text-gray-500">
                         {new Date().toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                       </div>
                       <div className="flex items-center space-x-1 shrink-0 px-2 py-0.5 bg-black border border-gray-800">
                         <span className="w-1.5 h-1.5 bg-[#4af626] rounded-full animate-ping" />
                         <span className="text-[8px] font-mono text-[#4af626]">RCV</span>
                       </div>
                     </div>
                   </div>

                   {/* Toast items body content */}
                   <div className="mt-3 pl-8 text-xs font-bold leading-relaxed text-gray-300">
                     <ul className="space-y-1.5 list-disc outline-none list-inside marker:text-gray-700">
                       {activeChecklist.items.map((it, idx) => (
                         <li key={idx} className="pl-1 drop-shadow-sm">{it.text}</li>
                       ))}
                     </ul>
                   </div>
                 </div>
               </div>
             </div>
          ) : (
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                playSynthSound('click');
                if (activeChecklist.level === 3 && !activeChecklist.isTimer && !activeChecklist.items.every(it => it.done)) {
                  playSynthSound('alarm');
                  addLog(`[保全拦截] 战区特级强锁清单「${activeChecklist.title}」含有严重安全威胁，背景关闭被熔断！请依次核检以下细项！`, "DANGER");
                } else {
                  addLog(`[保全拦截] 战区强锁核算清单「${activeChecklist.title}」未完全核检验收，严禁跳过点击背景退出！`, "WARN");
                }
              }
            }}
            className={`fixed inset-0 z-[200] flex items-center justify-center p-4 transition-all duration-1000 ${
              activeChecklist.isTimer
                ? 'bg-black/90 backdrop-blur-md'
                : activeChecklist.level === 3
                  ? activeChecklist.items.every(it => it.done)
                    ? 'bg-emerald-950/90 transition-all duration-1000'
                    : 'bg-red-950/95 transition-all duration-1000'
                  : 'bg-[#020702]/95 backdrop-blur-xs'
            }`}
          >
            {/* Level 3 Ambient Breathing Warning Strobe Overlay inside Backdrop */}
            {activeChecklist.level === 3 && !activeChecklist.isTimer && (
              <div className={`absolute inset-0 z-0 pointer-events-none select-none mix-blend-color-dodge transition-all duration-1000 ${
                activeChecklist.items.every(it => it.done)
                  ? 'animate-pulse bg-emerald-900/10'
                  : 'animate-[hazardFlash_1.5s_infinite_ease-in-out]'
              }`}>
                <div className="absolute inset-0 bg-grid opacity-30" />
                {/* Border warning headers flashing style */}
                <div className={`absolute top-10 left-10 text-[9px] font-mono tracking-widest uppercase font-bold transition-all duration-1000 ${
                  activeChecklist.items.every(it => it.done) ? 'text-[#4af626]/60' : 'text-red-500/40 animate-pulse'
                }`}>
                  {activeChecklist.items.every(it => it.done)
                    ? '[ GENERAL SYSTEM DE-ESCALATION: SAFE AUTHORIZATION ]'
                    : '[ CRT GENERAL WARNING: MANUAL VERIFICATION COMPULSORY ]'}
                </div>
                <div className={`absolute bottom-10 right-10 text-[9px] font-mono tracking-widest uppercase font-bold transition-all duration-1000 ${
                  activeChecklist.items.every(it => it.done) ? 'text-[#4af626]/60' : 'text-red-500/40 animate-pulse'
                }`}>
                  {activeChecklist.items.every(it => it.done)
                    ? '[ THREAT LEVEL SECURED - READY FOR DEPARTURE ]'
                    : '[ LEVEL 3 SAFETY INTERFACE DETECTED ]'}
                </div>
              </div>
            )}

            <div className={`w-full ${getModalSizeClass()} bg-[#020702] text-left shadow-2xl transition-all duration-300 relative overflow-hidden z-10 ${
              activeChecklist.isTimer
                ? 'border-2 border-fuchsia-500 pulsing-border-timer shadow-[0_0_20px_rgba(217,70,239,0.2)]'
                : activeChecklist.items.every(it => it.done)
                  ? 'border-2 border-[#4af626] shadow-[0_0_20px_rgba(74,246,38,0.2)] pulsing-border-green'
                  : activeChecklist.level === 3
                    ? 'border-2 border-red-500/80 shadow-[0_0_30px_rgba(239,68,68,0.5)]'
                    : 'border-2 border-red-500 shadow-red-500/10'
            }`}>

              {/* Radar scanner line overlay for timer inspection */}
              {activeChecklist.isTimer && (
                <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-fuchsia-500/0 via-fuchsia-500/20 to-fuchsia-500/0 h-10 pointer-events-none select-none animate-[scanLine_3s_infinite_linear]" />
              )}

              {/* 呼吸灯警戒线 (Breathing Hazard Rings behind the window) */}
              {activeChecklist.level === 3 && !activeChecklist.isTimer && (
                <>
                  <div className={`absolute -inset-6 -z-10 rounded-xs blur-md pointer-events-none select-none transition-all duration-1000 ${
                    activeChecklist.items.every(it => it.done) ? 'bg-[#4af626]/5' : 'bg-red-600/10 pulsing-alert-red'
                  }`} />
                  <div className={`absolute -inset-3 -z-10 border-2 rounded-xs pointer-events-none select-none transition-all duration-1000 ${
                    activeChecklist.items.every(it => it.done) ? 'border-[#4af626]/20 shadow-[0_0_15px_rgba(74,246,38,0.2)]' : 'border-red-500/60 shadow-[0_0_35px_rgba(239,68,68,0.7)] pulsing-alert-red'
                  }`} />
                </>
              )}

              {/* Level 3 Hazard Warning Stripes */}
              {activeChecklist.level === 3 && !activeChecklist.isTimer && (
                <div className="h-2 w-full select-none transition-all duration-1000" style={{
                  backgroundImage: activeChecklist.items.every(it => it.done)
                    ? 'repeating-linear-gradient(45deg, #10b981, #10b981 10px, #064e3b 10px, #064e3b 20px)'
                    : 'repeating-linear-gradient(45deg, #ef4444, #ef4444 10px, #000 10px, #000 20px)'
                }} />
              )}

              {/* Timer inspection Hazard Warning Stripes */}
              {activeChecklist.isTimer && (
                <div className="h-1.5 w-full select-none" style={{
                  backgroundImage: 'repeating-linear-gradient(45deg, #d946ef, #d946ef 10px, #020702 10px, #020702 20px)'
                }} />
              )}

              {/* Modal Cover Header */}
              <div className={`pl-5 pr-12 py-3.5 font-bold text-xs tracking-wider uppercase flex items-center justify-between select-none relative ${
                activeChecklist.isTimer
                  ? 'bg-gradient-to-r from-purple-800 via-fuchsia-700 to-pink-700 text-white shadow-[0_0_15px_rgba(217,70,239,0.3)]'
                  : activeChecklist.items.every(it => it.done)
                    ? 'bg-[#4af626] text-black'
                    : activeChecklist.level === 3
                      ? 'bg-red-600 text-white'
                      : 'bg-red-500 text-black'
              }`}>
                <div className="flex items-center space-x-2.5 min-w-0 pr-4">
                  <Clock className={`w-4.5 h-4.5 shrink-0 ${activeChecklist.isTimer ? 'text-fuchsia-300 animate-spin' : 'text-current'}`} style={activeChecklist.isTimer ? { animationDuration: '6s' } : undefined} />
                  <span className="truncate font-black">{activeChecklist.title}</span>
                  <span className={`px-2 py-0.5 text-[9px] font-mono rounded-sm select-none ${
                      activeChecklist.isTimer ? 'bg-black text-fuchsia-400 font-extrabold shadow-sm border border-fuchsia-900/35' : activeChecklist.level === 3 ? 'bg-black text-red-500 font-extrabold shadow-md' : 'bg-black text-white'
                  }`}>
                    {activeChecklist.isTimer ? '巡检' : `LV.${activeChecklist.level}`}
                  </span>
                  {activeChecklist.isTimer && (
                    <span className="hidden sm:inline-block text-[9px] bg-yellow-400 text-black px-1.5 py-0.5 font-bold animate-pulse">
                      🕒 [ SYSTEM INTERVAL SCAN ACTIVE ]
                    </span>
                  )}
                </div>

                {/* High comfort close touch target - hidden during Level 3 lock until all done */}
                {!(activeChecklist.level === 3 && !activeChecklist.isTimer && !activeChecklist.items.every(it => it.done)) ? (
                  <button
                    onClick={() => { playSynthSound('click'); setActiveChecklist(null); }}
                    className={`absolute right-0 top-0 bottom-0 w-12 h-full flex items-center justify-center border-l bg-black/10 hover:bg-black/25 font-extrabold text-lg cursor-pointer transition-all duration-150 ${
                      activeChecklist.isTimer ? 'border-fuchsia-900/40 text-fuchsia-400' : 'border-[#4af626]/25 text-black'
                    }`}
                    title="关闭检查清单"
                  >
                    ✕
                  </button>
                ) : (
                  <div className="absolute right-0 top-0 bottom-0 px-2.5 h-full flex items-center justify-center border-l border-red-700 bg-red-950/20 text-red-100 font-extrabold text-[9px] tracking-widest select-none animate-pulse">
                    🔒 强锁中
                  </div>
                )}
              </div>

              {/* Modal Main Content Container */}
              <div className="p-5 space-y-4 font-sans text-left">
                <div className="text-xs text-gray-400 border-b border-gray-950 pb-2.5 flex items-center justify-between">
                  <div>目前此项要求二次检验核实相关的清单内容：</div>
                  <div className="text-[10px] font-mono text-gray-500">
                    已确认 ({activeChecklist.items.filter(it => it.done).length} / {activeChecklist.items.length})
                  </div>
                </div>

                {/* Checkboxes mapping */}
                <ul className="space-y-2 max-h-[280px] overflow-y-auto">
                  {activeChecklist.items.map(item => (
                    <li
                      key={item.id}
                      onClick={() => handleToggleCheckItem(item.id)}
                      className={`border p-3 flex items-start space-x-3 cursor-pointer select-none transition-all ${
                        item.done
                          ? activeChecklist.isTimer 
                            ? 'border-fuchsia-500 bg-fuchsia-950/20 text-fuchsia-300'
                            : 'border-[#4af626] bg-[#4af626]/5 text-[#4af626]'
                          : activeChecklist.isTimer
                            ? 'border-fuchsia-950/40 bg-black/30 text-gray-450 hover:border-fuchsia-800/40'
                            : 'border-[#ffb000]/40 bg-black/30 text-gray-400 hover:border-red-900/40'
                      }`}
                    >
                      <div className="pt-0.5 shrink-0">
                        {item.done ? (
                          <CheckSquare className={`w-4.5 h-4.5 ${activeChecklist.isTimer ? 'text-fuchsia-400' : 'text-[#4af626]'}`} />
                        ) : (
                          <Square className={`w-4.5 h-4.5 text-gray-700 ${activeChecklist.isTimer ? 'hover:text-fuchsia-500' : 'hover:text-red-500'}`} />
                        )}
                      </div>
                      <div className="flex-1 text-xs font-bold leading-relaxed whitespace-pre-wrap">
                        {item.text}
                      </div>
                      <div className={`text-[9px] shrink-0 font-mono px-1 border self-center ${
                        item.done 
                          ? activeChecklist.isTimer ? 'border-fuchsia-500/50 text-fuchsia-400' : 'border-[#4af626]/50 text-[#4af626]' 
                          : 'border-gray-800 text-gray-600'
                      }`}>
                        {item.done ? '通过' : '待确认'}
                      </div>
                    </li>
                  ))}
                </ul>

                {/* Action trigger footer button */}
                <div className="pt-2 flex flex-col items-center">
                  <p className={`text-[10px] mb-2 text-center text-gray-500`}>
                    {activeChecklist.level === 3 && !activeChecklist.isTimer ? (
                      <span className="text-red-500 font-bold animate-pulse">⚠️ 等级限制：必须勾选完所有的检查项目方可关闭此确认弹窗！</span>
                    ) : (
                      <span>你也可以点击弹窗框右上角的叉号跳过此项检查</span>
                    )}
                  </p>
                  <button
                    onClick={() => {
                      playSynthSound('success');
                      setActiveChecklist(null);
                      addLog(`前线例行安全排雷完毕，对应指令「${activeChecklist.title}」已核准释放。`, "SUCCESS");
                    }}
                    disabled={!activeChecklist.items.every(it => it.done)}
                    className={`w-full py-3.5 text-center font-bold text-xs uppercase tracking-wider transition-all border ${
                      activeChecklist.items.every(it => it.done)
                        ? activeChecklist.isTimer
                          ? 'bg-fuchsia-600 text-white border-fuchsia-500 shadow-[0_0_15px_rgba(217,70,239,0.4)] cursor-pointer'
                          : 'bg-[#4af626] text-black border-[#4af626] shadow-sm'
                        : 'bg-transparent text-gray-650 border-gray-850 pointer-events-none'
                    }`}
                  >
                    {activeChecklist.items.every(it => it.done) ? "[ 所有检查已完成 ]" : "[ 当前列表未核对确认完毕 ]"}
                  </button>
                </div>

              </div>
            </div>
          </div>
          )
        )}

{/* ================= MODAL L5: SYSTEM TACTICAL ELECTRONIC WARFARE LOGS ================= */}
      {isLogModalOpen && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setIsLogModalOpen(false); }}
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-[250] flex items-center justify-center p-4 animate-flicker-ambient"
        >
          <div className="w-full max-w-2xl border-2 border-[#4af626]/60 bg-[#020702] text-left shadow-2xl flex flex-col h-[520px] rounded-xs overflow-hidden">
            
            {/* Header */}
            <div className="bg-[#4af626] text-black pl-5 pr-12 py-3.5 font-bold text-xs tracking-wider uppercase flex items-center justify-between select-none relative">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-black shrink-0 animate-pulse" />
                <span className="font-black">应用内部运行日志</span>
              </div>
              <button
                onClick={() => { playSynthSound('click'); setIsLogModalOpen(false); }}
                className="absolute right-0 top-0 bottom-0 w-12 h-full flex items-center justify-center border-l border-black/10 bg-black/10 hover:bg-black/25 font-extrabold text-sm cursor-pointer transition-all duration-150 text-black font-mono font-black"
              >
                ✕
              </button>
            </div>

            {/* Quick operations header & search bar */}
            <div className="p-4 border-b border-[#4af626]/12 bg-black/55 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="搜索运行日志关键字..."
                  value={searchLogQuery}
                  onChange={(e) => setSearchLogQuery(e.target.value)}
                  className="w-full bg-black border border-[#4af626]/25 px-3 py-1.5 text-xs text-[#4af626] font-mono focus:outline-none focus:border-[#4af626]/65"
                />
                {searchLogQuery && (
                  <button
                    onClick={() => setSearchLogQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#4af626] text-xs font-bold leading-none"
                  >
                    ×
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs shrink-0 self-end sm:self-center">
                <button
                  onClick={handleExportLogsText}
                  className="px-3 py-1.5 border border-[#4af626] bg-emerald-950/25 hover:bg-[#4af626] hover:text-black font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  title="导出日志文件到本地"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>[ 导出及下载 TXT 日志 ]</span>
                </button>
                <button
                  onClick={() => {
                    requestConfirm("确定要清理所有的日志数据吗？此操作不可逆。", "清空日志", () => {
                      const timeStr = new Date().toLocaleTimeString('zh-CN', { hour12: false });
                      setLogs([
                        {
                          id: 'wipe-log',
                          timestamp: timeStr,
                          category: 'SYSTEM',
                          message: '电子战系统日志数据链全部清洗并重新挂档。'
                        }
                      ]);
                      setConfirmModal(null);
                      playSynthSound('confirm');
                    });
                  }}
                  className="px-3 py-1.5 border border-red-900/60 hover:bg-red-950/20 hover:text-red-400 text-red-500 font-mono font-bold transition-all cursor-pointer"
                  title="彻底清除日志"
                >
                  [ 强制清除本地记录 ]
                </button>
              </div>
            </div>

            {/* Scrollable list of logs */}
            <div className="flex-1 overflow-y-auto p-5 space-y-2 bg-black/10 font-mono text-[11px] leading-relaxed select-text">
              {(() => {
                const filtered = logs.filter(l =>
                  l.message.toLowerCase().includes(searchLogQuery.toLowerCase()) ||
                  l.timestamp.includes(searchLogQuery) ||
                  l.category.toLowerCase().includes(searchLogQuery.toLowerCase())
                );
                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-20 text-gray-650 font-mono text-xs">
                      没有搜索关键词匹配到相关的日志行。
                    </div>
                  );
                }
                return filtered.map((log) => (
                  <div key={log.id} className="flex items-start gap-2.5 border-b border-gray-950 pb-1.5 last:border-b-0">
                    <span className="text-gray-500 shrink-0 select-none">[{log.timestamp}]</span>
                    <span className={`px-1.5 text-[8px] font-extrabold shrink-0 border uppercase rounded-xs font-mono leading-none py-0.5 select-none ${
                      log.category === 'SUCCESS' ? 'border-emerald-600/35 text-[#4af626] bg-emerald-950/25' :
                      log.category === 'WARN' ? 'border-[#ffb000]/30 text-[#ffb000] bg-yellow-950/20' :
                      log.category === 'DANGER' ? 'border-red-800/40 text-red-400 bg-red-950/20' :
                      log.category === 'SYSTEM' ? 'border-gray-800 text-gray-300 bg-gray-900/20' :
                      'border-cyan-800 text-[#00ffff] bg-cyan-950/25'
                    }`}>{log.category}</span>
                    <span className={`flex-grow select-text ${
                      log.category === 'DANGER' ? 'text-red-400 font-bold' :
                      log.category === 'WARN' ? 'text-[#ffb000]' :
                      log.category === 'SUCCESS' ? 'text-[#4af626]' :
                      log.category === 'SYSTEM' ? 'text-gray-200' : 'text-gray-300'
                    }`}>{log.message}</span>
                  </div>
                ));
              })()}
            </div>

            {/* Modal footer status */}
            <div className="p-3 border-t border-[#4af626]/12 bg-black font-mono text-[9px] text-[#4af626]/40 flex items-center justify-between select-none">
              <span>连线状态: 正常 // 所属: 当前网页终端</span>
              <span>已收录记录行数: {logs.length} 项</span>
            </div>
            
          </div>
        </div>
      )}

      {/* ================= MODAL L2: DIRECT SYSTEM INLINE CONFIRM OVERLAY ================= */}
      {confirmModal !== null && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmModal(null); }}
          className="fixed inset-0 bg-black/95 z-[300] flex items-center justify-center p-4 animate-flicker-ambient"
        >
          <div className="w-full max-w-sm border border-[#ffb000] bg-[#020702] text-left shadow-2xl">
            <div className="bg-[#ffb000] px-4 py-2 font-bold text-[10px] text-black uppercase flex items-center space-x-1.5 select-none">
              <AlertTriangle className="w-3.5 h-3.5 text-black" />
              <span>&gt; 强制验证核发确认提示</span>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs font-semibold text-[#ffb000] tracking-wide leading-relaxed">
                {confirmModal.msg}
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <button
                  onClick={() => setConfirmModal(null)}
                  className="py-2 border border-gray-800 text-gray-400 hover:bg-gray-850 transition-all font-bold cursor-pointer"
                >
                  [ 取消 ]
                </button>
                <button
                  onClick={confirmModal.onConfirm}
                  className="py-2 bg-red-950/20 border-2 border-red-500 text-red-400 font-bold hover:bg-red-500 hover:text-black transition-all cursor-pointer"
                >
                  [ {confirmModal.yesText} ]
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL L3: THE GENERAL TEMPLATE LIBRARY PICKER ================= */}
      {libPickerOpen !== null && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setLibPickerOpen(null); }}
          className="fixed inset-0 bg-[#020702]/95 backdrop-blur-xs z-[210] flex items-center justify-center p-4"
        >
          <div className="w-full max-w-lg border border-[#ffb000] bg-[#020702] text-left shadow-2xl relative">
            <div className="bg-[#ffb000] pl-4 pr-12 py-2 text-black font-extrabold text-[10px] uppercase flex items-center justify-between select-none relative">
              <div className="flex items-center space-x-1.5 min-w-0 pr-4">
                <Download className="w-3.5 h-3.5 text-black shrink-0" />
                <span className="truncate">从公共模板库中克隆 ({libPickerOpen === 'active' ? '主动类' : '被动危情应对型'})</span>
              </div>
              <button
                onClick={() => setLibPickerOpen(null)}
                className="absolute right-0 top-0 bottom-0 w-12 h-full flex items-center justify-center hover:bg-black/15 text-black font-bold text-base cursor-pointer border-none bg-transparent"
              >
                ✕
              </button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-[11px] text-gray-500 leading-normal">
                您可以选择下方任意模板克隆引入并作为基础：
              </p>

              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {appData.library.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-gray-900 text-gray-750 text-xs">
                    目前由于公共库尚未建立，无法克隆。
                  </div>
                ) : (
                  appData.library.map((libItem) => (
                    <button
                      key={libItem.id}
                      onClick={() => handlePickFromLibrary(libItem)}
                      className={`w-full text-left p-3 border transition-all cursor-pointer flex justify-between items-center group relative ${borderLeftAccent(libItem.color)}`}
                    >
                      <div className="pr-3">
                        <div className="text-xs font-bold text-gray-300 group-hover:text-[#4af626] transition-all truncate">{libItem.name}</div>
                        <div className="text-[9px] text-gray-500 mt-0.5 line-clamp-1">包含细项: {libItem.items.join(' | ')}</div>
                      </div>
                      <span className="text-[10px] b-t shrink-0 border border-[#ffb000]/60 text-[#ffb000] px-1.5 py-0.5 group-hover:bg-[#ffb000]/10 font-bold uppercase tracking-wider">
                        克隆条目
                      </span>
                    </button>
                  ))
                )}
              </div>

              <div className="pt-1 flex justify-end">
                <button
                  onClick={() => setLibPickerOpen(null)}
                  className="px-4 py-2 border border-gray-700 hover:bg-gray-850 text-xs text-gray-400 font-bold cursor-pointer"
                >
                  取消导入
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL L5: DETAILED IMPORT WARNING AND CHOICE ================= */}
      {importDetails !== null && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setImportDetails(null); }}
          className="fixed inset-0 bg-black/95 z-[330] flex items-center justify-center p-4 animate-flicker-ambient animate-pulseGlow"
        >
          <div className="w-full max-w-xl border-2 border-red-500 bg-[#020702] text-left shadow-2xl relative">
            <div className="bg-red-500 pl-4 pr-12 py-2 font-bold text-[10px] text-black uppercase flex items-center justify-between select-none relative">
              <div className="flex items-center space-x-1.5 min-w-0 pr-4">
                <AlertTriangle className="w-3.5 h-3.5 text-black animate-pulse shrink-0" />
                <span className="truncate">&gt; 导入数据包校验</span>
              </div>
              <button
                onClick={() => setImportDetails(null)}
                className="absolute right-0 top-0 bottom-0 w-12 h-full flex items-center justify-center hover:bg-black/15 text-black font-extrabold text-base cursor-pointer border-none bg-transparent"
              >
                ✕
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="border border-red-950/40 bg-red-950/20 p-3 text-xs text-red-400 font-bold space-y-1">
                <div className="text-[10px] text-red-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  成功识别提取的数据：
                </div>
                <div className="text-sm font-black text-gray-100">{importDetails.title}</div>
                <div className="text-[11px] text-gray-300 font-normal leading-relaxed">{importDetails.summary}</div>
              </div>

              <div className="space-y-2 text-xs">
                <h4 className="font-bold text-[#ffb000]">⚔️ 请选择导入的方式：</h4>
                <p className="text-[10px] text-gray-400 leading-relaxed font-normal">
                  ⚠️ <span className="text-red-400 font-bold">完全覆写模式 (Overwrite)</span>：直接清空您当前的相应防区编连/定时器/模版库，以该空降密钥的内容进行全面强制替代（在您手动操作后自动写入物理芯片中）。
                  <br />
                  ➕ <span className="text-emerald-400 font-bold">追加合并模式 (Append)</span>：保留您当前的全部配置，仅仅在数据库末尾追加并连装载密钥数据包中的全部要素。
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs pt-2">
                <button
                  onClick={() => executeImport('append')}
                  className="py-2.5 bg-emerald-950/20 border border-emerald-500 text-emerald-400 font-bold hover:bg-emerald-500 hover:text-black transition-all cursor-pointer text-center"
                >
                  追加导入
                </button>
                <button
                  onClick={() => executeImport('overwrite')}
                  className="py-2.5 bg-red-950/20 border border-red-500 text-red-400 font-bold hover:bg-red-500 hover:text-black transition-all cursor-pointer text-center"
                >
                  覆盖导入
                </button>
              </div>

              <div className="text-center pt-1">
                <button
                  onClick={() => setImportDetails(null)}
                  className="text-[11px] text-gray-500 hover:text-white underline cursor-pointer"
                >
                  取消并抛弃
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL L4: EXPORT SHARE CARD ================= */}
      {shareCode !== null && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShareCode(null); }}
          className="fixed inset-0 bg-black/95 z-[320] flex items-center justify-center p-4 animate-flicker-ambient"
        >
          <div className="w-full max-w-xl border border-cyan-500 bg-[#020702] text-left shadow-2xl relative">
            <div className="bg-cyan-500 pl-4 pr-12 py-2 font-bold text-[10px] text-black uppercase flex items-center justify-between select-none relative">
              <div className="flex items-center space-x-1.5 min-w-0 pr-4">
                <FileCode className="w-3.5 h-3.5 text-black shrink-0" />
                <span className="truncate">&gt; 无损战略防区密钥打包完毕</span>
              </div>
              <button
                onClick={() => setShareCode(null)}
                className="absolute right-0 top-0 bottom-0 w-12 h-full flex items-center justify-center hover:bg-black/15 text-black font-extrabold text-base cursor-pointer border-none bg-transparent"
              >
                ✕
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-[11px] text-gray-500 leading-normal">
                请直接选取并复制下方生成好的数据项，发给别人以供他人导入：
              </p>

              <textarea
                value={shareCode}
                readOnly
                onClick={(e) => (e.target as any).select()}
                className="w-full h-32 bg-black border border-[#00ffff]/30 p-2.5 text-[11px] text-cyan-400 focus:outline-none font-mono select-all"
              />

              <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(shareCode);
                    showToast("防区打包配置码复制成功！");
                    playSynthSound('success');
                    setShareCode(null);
                  }}
                  className="py-2.5 bg-cyan-950/20 border border-cyan-500 text-cyan-400 font-bold hover:bg-cyan-500 hover:text-black transition-all cursor-pointer"
                >
                  复制数据板
                </button>
                <button
                  onClick={() => setShareCode(null)}
                  className="py-2.5 border border-gray-800 text-gray-400 font-bold cursor-pointer"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TELEMETRY TOAST STACK (LV1 HIGH FREQUENCY TACTICAL BROADCAST STACKS) ================= */}
      {toasts.length > 0 && activeChecklist === null && (
        <div className="fixed inset-0 z-[450] flex flex-col items-center justify-center pointer-events-none select-none overflow-hidden pb-[10vh]">
          <div className="w-full max-w-md sm:max-w-xl flex flex-col gap-2.5 px-4 pointer-events-auto max-h-[85vh] overflow-y-auto no-scrollbar">
            {toasts.map((toast) => {
              const borderClass = toast.isTimer ? "border-fuchsia-500 shadow-[0_0_15px_rgba(217,70,239,0.25)]" : "border-[#ffb000] shadow-[0_0_15px_rgba(255,176,0,0.25)]";
              return (
                <div
                  key={toast.id}
                  onClick={() => {
                    playSynthSound('click');
                    setToasts(prev => prev.filter(t => t.id !== toast.id));
                  }}
                  className={`relative border-2 ${borderClass} bg-black/95 p-3.5 select-none animate-flicker-ambient cursor-pointer hover:border-white transition-all rounded-xs`}
                  title="点击快速关闭"
                >
                  {/* Warning Hazard Stripes */}
                  <div className="absolute top-0 left-0 right-0 h-1 select-none" style={{
                    backgroundImage: toast.isTimer
                      ? 'repeating-linear-gradient(45deg, #d946ef, #d946ef 6px, #000 6px, #000 12px)'
                      : 'repeating-linear-gradient(45deg, #ffb000, #ffb000 6px, #000 6px, #000 12px)'
                  }} />

                  {/* Header details */}
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <div className="flex items-center space-x-2 shrink-0 min-w-0">
                      <div className={`w-6 h-6 rounded-xs border flex items-center justify-center bg-black shrink-0 ${toast.isTimer ? 'border-fuchsia-500 text-fuchsia-400' : 'border-[#ffb000] text-[#ffb000]'}`}>
                        <Clock className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} />
                      </div>
                      <div className="min-w-0 truncate">
                        <span className={`text-[10px] sm:text-xs font-black tracking-wider px-1.5 py-0.5 border uppercase select-none rounded-xs font-mono truncate block ${
                          toast.isTimer 
                            ? 'border-fuchsia-900/35 text-fuchsia-400 bg-fuchsia-950/25' 
                            : 'border-[#ffb000]/25 text-[#ffb000] bg-[#ffb000]/10'
                        }`}>
                          {toast.title || "LV1 广播"}
                        </span>
                      </div>
                    </div>

                    <div className={`text-[9.5px] font-black border px-1.5 py-0.5 shrink-0 rounded-xs select-none ${
                      toast.isTimer 
                        ? 'border-fuchsia-800 text-fuchsia-300 bg-fuchsia-950/40' 
                        : 'border-yellow-850 text-[#ffb000] bg-yellow-950/40'
                    }`}>
                      ⚡ 点击解除
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className={`mt-2 p-2.5 text-left border rounded-xs font-bold font-mono tracking-wide ${
                    toast.isTimer ? 'border-fuchsia-500/20 bg-fuchsia-950/5 text-fuchsia-300' : 'border-[#ffb000]/20 bg-yellow-950/5 text-[#ffb000]'
                  }`}>
                    <div className="space-y-1 text-xs leading-relaxed text-gray-200">
                      {toast.items.map((item, itemIdx) => (
                        <div key={itemIdx} className={`flex items-start space-x-1.5 pb-1 last:border-b-0 last:pb-0 ${
                          toast.isTimer ? 'border-fuchsia-500/10' : 'border-[#ffb000]/10'
                        }`}>
                          <span className={`mt-0.5 shrink-0 ${toast.isTimer ? 'text-fuchsia-400' : 'text-[#ffb000]'}`}>▸</span>
                          <span className="break-words whitespace-pre-wrap">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Micro sound indicator representation */}
                  <div className="mt-2 flex items-center justify-between text-[8px] sm:text-[9px] text-gray-550 font-mono">
                    <span className={toast.isTimer ? "text-fuchsia-500/40" : "text-amber-500/40"}>组: {toast.isTimer ? "L1_CLOCK_SYNC" : "SECTOR_BROADCAST"}</span>
                    <div className="flex items-center space-x-0.5">
                      {[1, 2, 3, 2, 4, 1, 3, 2].map((h, i) => (
                        <div
                          key={i}
                          className={`w-0.5 ${toast.isTimer ? 'bg-fuchsia-500' : 'bg-[#ffb000]'}`}
                          style={{
                            height: `${h * 2}px`,
                          }}
                        />
                      ))}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer copyright stamp */}
      <footer className="mt-auto pt-6 text-center select-none text-[9px] text-gray-700 tracking-wider">
        <span>© WARNO ULTIMATE CORESYSTEM TERMINAL FRONT // FREE DUAL CONTROL FLUID</span>
      </footer>

    </div>
  );
}
