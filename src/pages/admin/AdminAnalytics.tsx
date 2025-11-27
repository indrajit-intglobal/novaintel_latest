import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
    BarChart3, 
    TrendingUp, 
    FileText, 
    Users, 
    Briefcase,
    Loader2,
    CheckCircle,
    XCircle,
    Clock,
    Activity,
    Calendar,
    Target,
    TrendingDown,
    Award,
    Building2,
    PieChart as PieChartIcon
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Area, AreaChart, Bar, BarChart, Cell, Line, LineChart, Pie, PieChart, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from "recharts";

const COLORS = {
    pending: "#eab308",
    approved: "#22c55e",
    rejected: "#ef4444",
    on_hold: "#3b82f6",
    draft: "#94a3b8",
    active: "#3b82f6",
    submitted: "#f59e0b",
    won: "#22c55e",
    lost: "#ef4444",
    archived: "#6b7280",
};

const PROJECT_STATUS_COLORS = {
    "Draft": "#94a3b8",
    "Active": "#3b82f6",
    "Submitted": "#f59e0b",
    "Won": "#22c55e",
    "Lost": "#ef4444",
    "Archived": "#6b7280",
};

export default function AdminAnalytics() {
    const { user } = useAuth();

    if (user?.role !== "pre_sales_manager") {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-full">
                    <Card className="p-6">
                        <p className="text-muted-foreground">Access denied. Manager role required.</p>
                    </Card>
                </div>
            </DashboardLayout>
        );
    }

    const { data: analytics, isLoading, error } = useQuery({
        queryKey: ["admin-analytics"],
        queryFn: () => apiClient.getAdminAnalytics(),
        retry: 1,
    });

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            </DashboardLayout>
        );
    }

    if (error) {
        return (
            <DashboardLayout>
                <div className="space-y-6 sm:space-y-8">
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6 sm:p-8 border border-border/40">
                        <div className="relative z-10">
                            <h1 className="mb-2 font-heading text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                                Analytics & Reports
                            </h1>
                            <p className="text-sm sm:text-base text-muted-foreground">Comprehensive insights and metrics</p>
                        </div>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
                    </div>
                    
                    <Card className="p-6 sm:p-8">
                        <div className="text-center">
                            <XCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
                            <p className="text-lg font-semibold mb-2">Error loading analytics</p>
                            <p className="text-sm text-muted-foreground">
                                {error instanceof Error ? error.message : "Failed to fetch analytics data. Please try again later."}
                            </p>
                        </div>
                    </Card>
                </div>
            </DashboardLayout>
        );
    }

    if (!analytics) {
        return (
            <DashboardLayout>
                <div className="space-y-6 sm:space-y-8">
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6 sm:p-8 border border-border/40">
                        <div className="relative z-10">
                            <h1 className="mb-2 font-heading text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                                Analytics & Reports
                            </h1>
                            <p className="text-sm sm:text-base text-muted-foreground">Comprehensive insights and metrics</p>
                        </div>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
                    </div>
                    
                    <Card className="p-6 sm:p-8">
                        <div className="text-center">
                            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-lg font-semibold mb-2">No analytics data available</p>
                            <p className="text-sm text-muted-foreground">
                                There is no data to display yet. Analytics will appear once you have proposals and projects in the system.
                            </p>
                        </div>
                    </Card>
                </div>
            </DashboardLayout>
        );
    }

    // Prepare chart data
    const statusChartData = [
        { name: "Approved", value: analytics.proposals?.approved || 0, fill: COLORS.approved },
        { name: "Pending", value: analytics.proposals?.pending || 0, fill: COLORS.pending },
        { name: "Rejected", value: analytics.proposals?.rejected || 0, fill: COLORS.rejected },
        { name: "On Hold", value: analytics.proposals?.on_hold || 0, fill: COLORS.on_hold },
        { name: "Draft", value: analytics.proposals?.by_status?.draft || 0, fill: COLORS.draft },
    ].filter(item => item.value > 0);

    const projectStatusChartData = Object.entries(analytics.projects?.by_status || {}).map(([status, count]) => ({
        name: status,
        value: count,
        fill: PROJECT_STATUS_COLORS[status as keyof typeof PROJECT_STATUS_COLORS] || "#94a3b8"
    })).filter(item => item.value > 0);

    const dailyData = analytics.time_series?.daily_submissions?.slice(-14) || [];
    const weeklyData = analytics.time_series?.weekly || [];
    const projectCreationData = analytics.time_series?.project_creation?.slice(-14) || [];

    // Combine daily submissions and approvals for line chart
    const dailyTrendData = dailyData.map((submission, index) => ({
        date: submission.label,
        submissions: submission.value,
        approvals: analytics.time_series?.daily_approvals?.[analytics.time_series.daily_approvals.length - 14 + index]?.value || 0,
    }));

    // Industry distribution data
    const industryData = (analytics.industry_distribution || []).map(item => ({
        name: item.industry || "Unknown",
        value: item.count
    }));

    // User activity data
    const userActivityData = analytics.users?.top_contributors || [];

    const chartConfig = {
        submissions: {
            label: "Submissions",
            color: "hsl(var(--chart-1))",
        },
        approvals: {
            label: "Approvals",
            color: "hsl(var(--chart-2))",
        },
        rejections: {
            label: "Rejections",
            color: "hsl(var(--destructive))",
        },
        projects: {
            label: "Projects",
            color: "hsl(var(--chart-3))",
        },
    };

    return (
        <DashboardLayout>
            <div className="space-y-6 sm:space-y-8">
                {/* Header */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6 sm:p-8 border border-border/40">
                    <div className="relative z-10">
                        <h1 className="mb-2 font-heading text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                            Analytics & Reports
                        </h1>
                        <p className="text-sm sm:text-base text-muted-foreground">Comprehensive insights and metrics for your organization</p>
                    </div>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
                </div>

                {/* Overview Cards */}
                <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-2 lg:grid-cols-4">
                    <Card className="group relative overflow-hidden p-4 border-border/40 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <div className="relative flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Total Proposals</p>
                                <p className="text-xl sm:text-2xl font-bold text-foreground">{analytics.proposals?.total || 0}</p>
                                <div className="flex items-center gap-1 mt-1">
                                    <TrendingUp className="h-3 w-3 text-green-500" />
                                    <span className="text-xs text-muted-foreground">
                                        {analytics.activity?.recent_submissions || 0} last 7 days
                                    </span>
                                </div>
                            </div>
                            <div className="ml-2 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-500/5 p-2 text-blue-600">
                                <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
                            </div>
                        </div>
                    </Card>

                    <Card className="group relative overflow-hidden p-4 border-border/40 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <div className="relative flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Total Projects</p>
                                <p className="text-xl sm:text-2xl font-bold text-foreground">{analytics.projects?.total || 0}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {analytics.projects?.active || 0} Active
                                </p>
                            </div>
                            <div className="ml-2 rounded-lg bg-gradient-to-br from-purple-500/10 to-purple-500/5 p-2 text-purple-600">
                                <Briefcase className="h-5 w-5 sm:h-6 sm:w-6" />
                            </div>
                        </div>
                    </Card>

                    <Card className="group relative overflow-hidden p-4 border-border/40 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                        <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <div className="relative flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Total Users</p>
                                <p className="text-xl sm:text-2xl font-bold text-foreground">{analytics.users?.total || 0}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {analytics.users?.analysts || 0} Analysts, {analytics.users?.managers || 0} Managers
                                </p>
                            </div>
                            <div className="ml-2 rounded-lg bg-gradient-to-br from-green-500/10 to-green-500/5 p-2 text-green-600">
                                <Users className="h-5 w-5 sm:h-6 sm:w-6" />
                            </div>
                        </div>
                    </Card>

                    <Card className="group relative overflow-hidden p-4 border-border/40 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <div className="relative flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Approval Rate</p>
                                <p className="text-xl sm:text-2xl font-bold text-foreground">{analytics.activity?.approval_rate || 0}%</p>
                                <div className="flex items-center gap-1 mt-1">
                                    <CheckCircle className="h-3 w-3 text-green-500" />
                                    <span className="text-xs text-muted-foreground">
                                        {analytics.activity?.recent_approvals || 0} approvals (7 days)
                                    </span>
                                </div>
                            </div>
                            <div className="ml-2 rounded-lg bg-gradient-to-br from-orange-500/10 to-orange-500/5 p-2 text-orange-600">
                                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" />
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Additional Metrics Cards */}
                <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-4">
                    <Card className="p-4 border-border/40 bg-card/80 backdrop-blur-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">Win Rate</p>
                                <p className="text-xl font-bold text-green-600">{analytics.projects?.win_rate || 0}%</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {analytics.projects?.won || 0} Won / {analytics.projects?.lost || 0} Lost
                                </p>
                            </div>
                            <Award className="h-5 w-5 text-green-600" />
                        </div>
                    </Card>

                    <Card className="p-4 border-border/40 bg-card/80 backdrop-blur-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">Pending Reviews</p>
                                <p className="text-xl font-bold text-yellow-600">{analytics.proposals?.pending || 0}</p>
                                <p className="text-xs text-muted-foreground mt-1">Awaiting approval</p>
                            </div>
                            <Clock className="h-5 w-5 text-yellow-600" />
                        </div>
                    </Card>

                    <Card className="p-4 border-border/40 bg-card/80 backdrop-blur-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">Active Projects</p>
                                <p className="text-xl font-bold text-blue-600">{analytics.projects?.active || 0}</p>
                                <p className="text-xs text-muted-foreground mt-1">In progress</p>
                            </div>
                            <Activity className="h-5 w-5 text-blue-600" />
                        </div>
                    </Card>

                    <Card className="p-4 border-border/40 bg-card/80 backdrop-blur-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">Top Industries</p>
                                <p className="text-xl font-bold">{analytics.industry_distribution?.length || 0}</p>
                                <p className="text-xs text-muted-foreground mt-1">Tracked</p>
                            </div>
                            <Building2 className="h-5 w-5 text-purple-600" />
                        </div>
                    </Card>
                </div>

                {/* Charts Grid */}
                <div className="grid gap-6 md:grid-cols-2">
                    {/* Proposal Status Pie Chart */}
                    <Card className="p-6 border-border/40 bg-card/80 backdrop-blur-sm shadow-sm">
                        <CardHeader className="pb-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg font-semibold">Proposal Status Distribution</CardTitle>
                                    <p className="text-sm text-muted-foreground mt-1">Total: {analytics.proposals?.total || 0}</p>
                                </div>
                                <PieChartIcon className="h-5 w-5 text-muted-foreground" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            {statusChartData.length > 0 ? (
                                <ChartContainer config={chartConfig} className="h-[300px]">
                                    <PieChart>
                                        <Pie
                                            data={statusChartData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                            outerRadius={100}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {statusChartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))}
                                        </Pie>
                                        <ChartTooltip content={<ChartTooltipContent />} />
                                    </PieChart>
                                </ChartContainer>
                            ) : (
                                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                                    No data available
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Project Status Pie Chart */}
                    <Card className="p-6 border-border/40 bg-card/80 backdrop-blur-sm shadow-sm">
                        <CardHeader className="pb-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg font-semibold">Project Status Distribution</CardTitle>
                                    <p className="text-sm text-muted-foreground mt-1">Total: {analytics.projects?.total || 0}</p>
                                </div>
                                <Target className="h-5 w-5 text-muted-foreground" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            {projectStatusChartData.length > 0 ? (
                                <ChartContainer config={chartConfig} className="h-[300px]">
                                    <PieChart>
                                        <Pie
                                            data={projectStatusChartData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                            outerRadius={100}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {projectStatusChartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))}
                                        </Pie>
                                        <ChartTooltip content={<ChartTooltipContent />} />
                                    </PieChart>
                                </ChartContainer>
                            ) : (
                                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                                    No data available
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Daily Trends Line Chart */}
                <Card className="p-6 border-border/40 bg-card/80 backdrop-blur-sm shadow-sm">
                    <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-lg font-semibold">Daily Activity Trends (14 Days)</CardTitle>
                                <p className="text-sm text-muted-foreground mt-1">Submissions vs Approvals</p>
                            </div>
                            <Calendar className="h-5 w-5 text-muted-foreground" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        {dailyTrendData.length > 0 ? (
                            <ChartContainer config={chartConfig} className="h-[350px]">
                                <LineChart data={dailyTrendData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis 
                                        dataKey="date" 
                                        tick={{ fontSize: 12 }}
                                        angle={-45}
                                        textAnchor="end"
                                        height={60}
                                    />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Legend />
                                    <Line 
                                        type="monotone" 
                                        dataKey="submissions" 
                                        stroke="hsl(var(--chart-1))" 
                                        strokeWidth={2}
                                        dot={{ r: 4 }}
                                        name="Submissions"
                                    />
                                    <Line 
                                        type="monotone" 
                                        dataKey="approvals" 
                                        stroke="hsl(var(--chart-2))" 
                                        strokeWidth={2}
                                        dot={{ r: 4 }}
                                        name="Approvals"
                                    />
                                </LineChart>
                            </ChartContainer>
                        ) : (
                            <div className="flex items-center justify-center h-[350px] text-muted-foreground">
                                No data available
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Weekly Trends and Industry Distribution */}
                <div className="grid gap-6 md:grid-cols-2">
                    {/* Weekly Trends Bar Chart */}
                    <Card className="p-6 border-border/40 bg-card/80 backdrop-blur-sm shadow-sm">
                        <CardHeader className="pb-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg font-semibold">Weekly Trends (Last 4 Weeks)</CardTitle>
                                    <p className="text-sm text-muted-foreground mt-1">Submissions, Approvals, and Rejections</p>
                                </div>
                                <BarChart3 className="h-5 w-5 text-muted-foreground" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            {weeklyData.length > 0 ? (
                                <ChartContainer config={chartConfig} className="h-[300px]">
                                    <BarChart data={weeklyData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis 
                                            dataKey="label" 
                                            tick={{ fontSize: 12 }}
                                        />
                                        <YAxis tick={{ fontSize: 12 }} />
                                        <ChartTooltip content={<ChartTooltipContent />} />
                                        <Legend />
                                        <Bar dataKey="submissions" fill="hsl(var(--chart-1))" name="Submissions" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="approvals" fill="hsl(var(--chart-2))" name="Approvals" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="rejections" fill="hsl(var(--destructive))" name="Rejections" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ChartContainer>
                            ) : (
                                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                                    No data available
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Industry Distribution */}
                    <Card className="p-6 border-border/40 bg-card/80 backdrop-blur-sm shadow-sm">
                        <CardHeader className="pb-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg font-semibold">Top Industries</CardTitle>
                                    <p className="text-sm text-muted-foreground mt-1">Project distribution by industry</p>
                                </div>
                                <Building2 className="h-5 w-5 text-muted-foreground" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            {industryData.length > 0 ? (
                                <ChartContainer config={chartConfig} className="h-[300px]">
                                    <BarChart data={industryData} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" tick={{ fontSize: 12 }} />
                                        <YAxis 
                                            dataKey="name" 
                                            type="category" 
                                            tick={{ fontSize: 12 }}
                                            width={120}
                                        />
                                        <ChartTooltip content={<ChartTooltipContent />} />
                                        <Bar dataKey="value" fill="hsl(var(--chart-3))" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ChartContainer>
                            ) : (
                                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                                    No data available
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Project Creation Trend and User Activity */}
                <div className="grid gap-6 md:grid-cols-2">
                    {/* Project Creation Trend */}
                    <Card className="p-6 border-border/40 bg-card/80 backdrop-blur-sm shadow-sm">
                        <CardHeader className="pb-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg font-semibold">Project Creation Trend (14 Days)</CardTitle>
                                    <p className="text-sm text-muted-foreground mt-1">New projects over time</p>
                                </div>
                                <TrendingUp className="h-5 w-5 text-muted-foreground" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            {projectCreationData.length > 0 ? (
                                <ChartContainer config={chartConfig} className="h-[300px]">
                                    <AreaChart data={projectCreationData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis 
                                            dataKey="label" 
                                            tick={{ fontSize: 12 }}
                                            angle={-45}
                                            textAnchor="end"
                                            height={60}
                                        />
                                        <YAxis tick={{ fontSize: 12 }} />
                                        <ChartTooltip content={<ChartTooltipContent />} />
                                        <Area 
                                            type="monotone" 
                                            dataKey="value" 
                                            stroke="hsl(var(--chart-3))" 
                                            fill="hsl(var(--chart-3))" 
                                            fillOpacity={0.6}
                                            name="Projects Created"
                                        />
                                    </AreaChart>
                                </ChartContainer>
                            ) : (
                                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                                    No data available
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Top Contributors */}
                    <Card className="p-6 border-border/40 bg-card/80 backdrop-blur-sm shadow-sm">
                        <CardHeader className="pb-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg font-semibold">Top Contributors</CardTitle>
                                    <p className="text-sm text-muted-foreground mt-1">Analysts by proposal count</p>
                                </div>
                                <Users className="h-5 w-5 text-muted-foreground" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            {userActivityData.length > 0 ? (
                                <ChartContainer config={chartConfig} className="h-[300px]">
                                    <BarChart data={userActivityData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis 
                                            dataKey="user" 
                                            tick={{ fontSize: 12 }}
                                            angle={-45}
                                            textAnchor="end"
                                            height={80}
                                        />
                                        <YAxis tick={{ fontSize: 12 }} />
                                        <ChartTooltip content={<ChartTooltipContent />} />
                                        <Bar dataKey="proposals" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} name="Proposals" />
                                    </BarChart>
                                </ChartContainer>
                            ) : (
                                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                                    No data available
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Detailed Status Breakdown */}
                <div className="grid gap-6 md:grid-cols-2">
                    <Card className="p-6 border-border/40 bg-card/80 backdrop-blur-sm shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg font-semibold">Proposal Status Breakdown</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.approved }}></div>
                                        <span className="font-medium">Approved</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl font-bold">{analytics.proposals?.approved || 0}</span>
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.pending }}></div>
                                        <span className="font-medium">Pending</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl font-bold">{analytics.proposals?.pending || 0}</span>
                                        <Clock className="h-4 w-4 text-yellow-500" />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.rejected }}></div>
                                        <span className="font-medium">Rejected</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl font-bold">{analytics.proposals?.rejected || 0}</span>
                                        <XCircle className="h-4 w-4 text-red-500" />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.on_hold }}></div>
                                        <span className="font-medium">On Hold</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl font-bold">{analytics.proposals?.on_hold || 0}</span>
                                        <Clock className="h-4 w-4 text-blue-500" />
                                    </div>
                                </div>
                                {analytics.proposals?.by_status?.draft > 0 && (
                                    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.draft }}></div>
                                            <span className="font-medium">Draft</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl font-bold">{analytics.proposals?.by_status?.draft || 0}</span>
                                            <FileText className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="p-6 border-border/40 bg-card/80 backdrop-blur-sm shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg font-semibold">Activity Metrics</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-muted-foreground">Recent Submissions (7 days)</span>
                                        <Activity className="h-4 w-4 text-blue-500" />
                                    </div>
                                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                                        {analytics.activity?.recent_submissions || 0}
                                    </p>
                                </div>
                                <div className="p-4 border rounded-lg bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-muted-foreground">Recent Approvals (7 days)</span>
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                    </div>
                                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                                        {analytics.activity?.recent_approvals || 0}
                                    </p>
                                </div>
                                <div className="p-4 border rounded-lg bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-muted-foreground">Win Rate</span>
                                        <Award className="h-4 w-4 text-purple-500" />
                                    </div>
                                    <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                                        {analytics.projects?.win_rate || 0}%
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {analytics.projects?.won || 0} Won / {analytics.projects?.lost || 0} Lost
                                    </p>
                                </div>
                                <div className="p-4 border rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">Approval Rate</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Based on reviewed proposals
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-3xl font-bold">{analytics.activity?.approval_rate || 0}%</p>
                                            <TrendingUp className="h-4 w-4 text-green-500 ml-auto mt-1" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
