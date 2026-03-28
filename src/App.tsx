import { useEffect, useState } from 'react';
import { Server, Activity, Thermometer, Cpu, Zap, Users, CheckCircle2, XCircle, Sun, Moon } from 'lucide-react';
import { cn } from './lib/utils';

interface GPUUser {
  username: string;
  memory: number;
}

interface GPUInfo {
  index: number;
  name: string;
  memory_total: number;
  memory_used: number;
  utilization: number;
  temperature: number;
  power: number;
  users: GPUUser[];
}

interface NodeData {
  node_name: string;
  is_online: boolean;
  last_seen: number;
  gpus: GPUInfo[];
}

export default function App() {
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const fetchNodes = async () => {
      try {
        const res = await fetch('/api/nodes');
        const data = await res.json();
        // Sort nodes alphabetically
        data.sort((a: NodeData, b: NodeData) => a.node_name.localeCompare(b.node_name));
        setNodes(data);
        setLastUpdated(new Date());
      } catch (error) {
        console.error("Failed to fetch node data:", error);
      }
    };

    fetchNodes();
    const interval = setInterval(fetchNodes, 10000); // Auto-refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (utilization: number) => {
    if (utilization >= 80) return "bg-red-500";
    if (utilization >= 30) return "bg-yellow-500";
    return "bg-emerald-500";
  };

  const getStatusText = (utilization: number) => {
    if (utilization >= 80) return "text-red-600 dark:text-red-500";
    if (utilization >= 30) return "text-yellow-600 dark:text-yellow-500";
    return "text-emerald-600 dark:text-emerald-500";
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200 font-sans transition-colors duration-200 selection:bg-indigo-500/30">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/50 sticky top-0 z-10 backdrop-blur-sm transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
              <Activity className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white tracking-tight">GMApp: GPU Monitoring App</h1>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Updates
            </div>
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-md transition-colors border border-slate-200 dark:border-slate-700"
              aria-label="Toggle Dark Mode"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Cluster Status</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Monitoring {nodes.length} compute nodes</p>
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-500">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        </div>

        {nodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl">
            <Server className="w-12 h-12 mb-4 opacity-20" />
            <p>Waiting for nodes to report...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {nodes.map((node) => (
              <div 
                key={node.node_name} 
                className={cn(
                  "bg-white dark:bg-slate-900 border rounded-xl overflow-hidden transition-all duration-200",
                  node.is_online ? "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm" : "border-red-200 dark:border-red-900/30 opacity-75"
                )}
              >
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800/50 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                  <div className="flex items-center gap-3">
                    {node.is_online ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                    <h3 className="text-lg font-medium text-slate-900 dark:text-white">{node.node_name}</h3>
                  </div>
                  <span className={cn(
                    "text-xs font-medium px-2.5 py-1 rounded-full border",
                    node.is_online 
                      ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20" 
                      : "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20"
                  )}>
                    {node.is_online ? "Online" : "Offline"}
                  </span>
                </div>

                <div className="p-5 space-y-6">
                  {!node.is_online && (
                    <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 p-3 rounded-md border border-red-100 dark:border-red-500/20">
                      Node hasn't reported in over 30 seconds. Last seen: {new Date(node.last_seen * 1000).toLocaleTimeString()}
                    </div>
                  )}

                  {node.gpus.length === 0 ? (
                    <p className="text-sm text-slate-500 italic">No GPUs detected on this node.</p>
                  ) : (
                    <div className="space-y-6">
                      {node.gpus.map((gpu) => (
                        <div key={gpu.index} className="space-y-3">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <div className={cn("w-2 h-2 rounded-full", getStatusColor(gpu.utilization))} />
                              <span className="font-medium text-slate-800 dark:text-slate-200 text-sm">GPU {gpu.index}: {gpu.name}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs">
                              <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400" title="Power Draw">
                                <Zap className="w-3.5 h-3.5" />
                                {gpu.power}W
                              </span>
                              <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400" title="Temperature">
                                <Thermometer className="w-3.5 h-3.5" />
                                {gpu.temperature}°C
                              </span>
                              <span className={cn("flex items-center gap-1 font-medium", getStatusText(gpu.utilization))} title="Utilization">
                                <Cpu className="w-3.5 h-3.5" />
                                {gpu.utilization}%
                              </span>
                            </div>
                          </div>

                          {/* Memory Bar */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                              <span>Memory</span>
                              <span>{Math.round(gpu.memory_used / 1024)}GB / {Math.round(gpu.memory_total / 1024)}GB</span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-indigo-500 transition-all duration-500 ease-out"
                                style={{ width: `${(gpu.memory_used / gpu.memory_total) * 100}%` }}
                              />
                            </div>
                          </div>

                          {/* Users */}
                          {gpu.users && gpu.users.length > 0 && (
                            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-md p-2.5 border border-slate-100 dark:border-slate-800/50">
                              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                                <Users className="w-3.5 h-3.5" />
                                Active Users
                              </div>
                              <div className="space-y-1.5">
                                {gpu.users.map((user, idx) => (
                                  <div key={idx} className="flex justify-between items-center text-xs">
                                    <span className="text-slate-700 dark:text-slate-300 font-medium">{user.username}</span>
                                    <span className="text-slate-500 dark:text-slate-500">{Math.round(user.memory)} MB</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
