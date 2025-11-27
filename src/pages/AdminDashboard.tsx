import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    FileText,
    Loader2,
    TrendingUp,
    Users,
    Briefcase,
    BarChart3,
    FolderKanban,
    MessageCircle,
    CheckCircle,
    XCircle,
    Clock,
    Search,
    Eye,
    Filter,
    Globe,
    Building2,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, Proposal, Project } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";
import { MarkdownText } from "@/components/ui/markdown-text";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function AdminDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const queryClient = useQueryClient();

    // Get active tab from URL or default to overview
    const activeTab = searchParams.get("tab") || "overview";
    const setActiveTab = (tab: string) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set("tab", tab);
        setSearchParams(newParams);
    };

    // Sync tab with URL on mount and URL changes
    useEffect(() => {
        const tab = searchParams.get("tab") || "overview";
        // If URL has view param, ensure we're on projects-case-studies tab
        const view = searchParams.get("view");
        if (view && tab !== "projects-case-studies") {
            setSearchParams({ tab: "projects-case-studies", view });
        }
    }, [searchParams, setSearchParams]);

    // Check if user is a manager
    if (user?.role !== "pre_sales_manager") {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-full">
                    <Card className="p-4">
                        <p className="text-muted-foreground">Access denied. Manager role required.</p>
                    </Card>
                </div>
            </DashboardLayout>
        );
    }

    // ========== OVERVIEW TAB STATE ==========
    const { data: analytics, isLoading: isLoadingAnalytics } = useQuery({
        queryKey: ["admin-analytics"],
        queryFn: () => apiClient.getAdminAnalytics(),
    });

    // ========== PROPOSALS TAB STATE ==========
    const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
    const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
    const [viewDialogOpen, setViewDialogOpen] = useState(false);
    const [feedback, setFeedback] = useState("");
    const [proposalActiveTab, setProposalActiveTab] = useState("pending_approval");
    const [proposalSearchQuery, setProposalSearchQuery] = useState("");
    const [pendingAction, setPendingAction] = useState<"approve" | "reject" | "hold" | null>(null);

    const { data: allProposals = [] } = useQuery({
        queryKey: ["admin-proposals-all"],
        queryFn: () => apiClient.getAdminDashboardProposals(),
        enabled: activeTab === "proposals",
    });

    const { data: proposals = [], isLoading: isLoadingProposals } = useQuery({
        queryKey: ["admin-proposals", proposalActiveTab],
        queryFn: () => apiClient.getAdminDashboardProposals(proposalActiveTab === "all" ? undefined : proposalActiveTab),
        enabled: activeTab === "proposals",
    });

    const reviewMutation = useMutation({
        mutationFn: ({ proposalId, action, feedback }: { proposalId: number; action: "approve" | "reject" | "hold"; feedback?: string }) =>
            apiClient.reviewProposal(proposalId, action, feedback),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-proposals"] });
            queryClient.invalidateQueries({ queryKey: ["admin-proposals-all"] });
            queryClient.invalidateQueries({ queryKey: ["admin-analytics"] });
            toast.success("Proposal reviewed successfully");
            setReviewDialogOpen(false);
            setSelectedProposal(null);
            setFeedback("");
            setPendingAction(null);
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to review proposal");
            setPendingAction(null);
        },
    });

    // ========== PROJECTS & CASE STUDIES TAB STATE ==========
    const [projectsCaseStudiesView, setProjectsCaseStudiesView] = useState<"projects" | "case-studies">("projects");
    const [projectSearchQuery, setProjectSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [industryFilter, setIndustryFilter] = useState<string>("all");
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [projectViewDialogOpen, setProjectViewDialogOpen] = useState(false);
    const [caseStudySearchQuery, setCaseStudySearchQuery] = useState("");
    const [caseStudyIndustryFilter, setCaseStudyIndustryFilter] = useState<string>("all");

    const { data: projects = [], isLoading: isLoadingProjects } = useQuery({
        queryKey: ["admin-projects"],
        queryFn: () => apiClient.getAllProjects(),
        enabled: activeTab === "projects-case-studies",
    });

    const { data: caseStudies = [], isLoading: isLoadingCaseStudies } = useQuery({
        queryKey: ["admin-case-studies"],
        queryFn: () => apiClient.listCaseStudies(),
        enabled: activeTab === "projects-case-studies",
    });

    const { data: projectDetails, isLoading: isLoadingDetails } = useQuery({
        queryKey: ["admin-project", selectedProject?.id],
        queryFn: () => apiClient.getAdminProject(selectedProject!.id),
        enabled: !!selectedProject && projectViewDialogOpen,
    });

    // Handle URL params for sub-view in projects-case-studies tab
    useEffect(() => {
        const subView = searchParams.get("view");
        if (subView === "case-studies" && activeTab === "projects-case-studies") {
            setProjectsCaseStudiesView("case-studies");
        } else if (subView === "projects" && activeTab === "projects-case-studies") {
            setProjectsCaseStudiesView("projects");
        }
    }, [searchParams, activeTab]);

    // ========== HELPER FUNCTIONS ==========
    const getStatusBadge = (status: string) => {
        const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
            draft: { variant: "outline", label: "Draft" },
            pending_approval: { variant: "secondary", label: "Pending" },
            approved: { variant: "default", label: "Approved" },
            rejected: { variant: "destructive", label: "Rejected" },
            on_hold: { variant: "outline", label: "On Hold" },
        };
        const config = variants[status] || { variant: "outline" as const, label: status };
        return <Badge variant={config.variant}>{config.label}</Badge>;
    };

    const handleReview = (action: "approve" | "reject" | "hold") => {
        if (!selectedProposal) return;
        setPendingAction(action);
        reviewMutation.mutate({
            proposalId: selectedProposal.id,
            action,
            feedback: feedback.trim() || undefined,
        });
    };

    const filteredProposals = proposals.filter((p) =>
        p.title.toLowerCase().includes(proposalSearchQuery.toLowerCase()) ||
        p.submitter_message?.toLowerCase().includes(proposalSearchQuery.toLowerCase())
    );

    const statusCounts = {
        all: allProposals.length,
        pending_approval: allProposals.filter((p) => p.status === "pending_approval").length,
        approved: allProposals.filter((p) => p.status === "approved").length,
        rejected: allProposals.filter((p) => p.status === "rejected").length,
        on_hold: allProposals.filter((p) => p.status === "on_hold").length,
    };

    const filteredProjects = projects.filter((p) => {
        const matchesSearch =
            p.name.toLowerCase().includes(projectSearchQuery.toLowerCase()) ||
            p.client_name.toLowerCase().includes(projectSearchQuery.toLowerCase());
        const matchesStatus = statusFilter === "all" || p.status === statusFilter;
        const matchesIndustry = industryFilter === "all" || p.industry === industryFilter;
        return matchesSearch && matchesStatus && matchesIndustry;
    });

    const filteredCaseStudies = caseStudies.filter((cs: any) => {
        const matchesSearch =
            cs.title?.toLowerCase().includes(caseStudySearchQuery.toLowerCase()) ||
            cs.description?.toLowerCase().includes(caseStudySearchQuery.toLowerCase());
        const matchesIndustry = caseStudyIndustryFilter === "all" || cs.industry === caseStudyIndustryFilter;
        return matchesSearch && matchesIndustry;
    });

    const industries = Array.from(new Set(projects.map((p) => p.industry))).sort();
    const statuses = Array.from(new Set(projects.map((p) => p.status))).sort();
    const caseStudyIndustries = Array.from(new Set(caseStudies.map((cs: any) => cs.industry).filter(Boolean))).sort();

    const projectStats = {
        total: projects.length,
        active: projects.filter((p) => p.status === "Active").length,
        submitted: projects.filter((p) => p.status === "Submitted").length,
        completed: projects.filter((p) => p.status === "Completed").length,
    };

    const caseStudyStats = {
        total: caseStudies.length,
        indexed: caseStudies.filter((cs: any) => cs.indexed).length,
    };

    return (
        <DashboardLayout>
            <div className="space-y-4 sm:space-y-6">
                {/* Compact Header */}
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-background p-4 sm:p-6 border border-border/40">
                    <div className="relative z-10">
                        <h1 className="mb-1 font-heading text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                            Admin Dashboard
                        </h1>
                        <p className="text-muted-foreground text-sm sm:text-base">
                            Complete overview and management of all proposals and data
                        </p>
                    </div>
                    <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl"></div>
                </div>

                {/* Main Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="proposals">Proposals</TabsTrigger>
                        <TabsTrigger value="projects-case-studies">Projects & Case Studies</TabsTrigger>
                    </TabsList>

                    {/* OVERVIEW TAB */}
                    <TabsContent value="overview" className="space-y-4 sm:space-y-6 mt-4">
                        {/* Compact Quick Access Cards */}
                        <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
                            <Card
                                className="group relative overflow-hidden p-4 border-border/40 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-1 hover:border-blue-300 cursor-pointer"
                                onClick={() => setActiveTab("proposals")}
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                <div className="relative flex items-center gap-3">
                                    <div className="rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-500/5 p-2 text-blue-600">
                                        <FileText className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-sm mb-0.5">Proposals</h3>
                                        <p className="text-xs text-muted-foreground">Review & approve</p>
                                    </div>
                                </div>
                            </Card>
                            <Card
                                className="group relative overflow-hidden p-4 border-border/40 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:shadow-green-500/10 hover:-translate-y-1 hover:border-green-300 cursor-pointer"
                                onClick={() => navigate("/admin/users")}
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                <div className="relative flex items-center gap-3">
                                    <div className="rounded-lg bg-gradient-to-br from-green-500/10 to-green-500/5 p-2 text-green-600">
                                        <Users className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-sm mb-0.5">Users</h3>
                                        <p className="text-xs text-muted-foreground">{analytics?.users?.total || 0} total</p>
                                    </div>
                                </div>
                            </Card>
                            <Card
                                className="group relative overflow-hidden p-4 border-border/40 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10 hover:-translate-y-1 hover:border-purple-300 cursor-pointer"
                                onClick={() => setActiveTab("projects-case-studies")}
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                <div className="relative flex items-center gap-3">
                                    <div className="rounded-lg bg-gradient-to-br from-purple-500/10 to-purple-500/5 p-2 text-purple-600">
                                        <Briefcase className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-sm mb-0.5">Projects</h3>
                                        <p className="text-xs text-muted-foreground">{analytics?.projects?.total || 0} total</p>
                                    </div>
                                </div>
                            </Card>
                            <Card
                                className="group relative overflow-hidden p-4 border-border/40 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/10 hover:-translate-y-1 hover:border-orange-300 cursor-pointer"
                                onClick={() => navigate("/admin/analytics")}
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                <div className="relative flex items-center gap-3">
                                    <div className="rounded-lg bg-gradient-to-br from-orange-500/10 to-orange-500/5 p-2 text-orange-600">
                                        <BarChart3 className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-sm mb-0.5">Analytics</h3>
                                        <p className="text-xs text-muted-foreground">{analytics?.activity?.approval_rate || 0}% approval</p>
                                    </div>
                                </div>
                            </Card>
                            <Card
                                className="group relative overflow-hidden p-4 border-border/40 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/10 hover:-translate-y-1 hover:border-indigo-300 cursor-pointer"
                                onClick={() => {
                                    setActiveTab("projects-case-studies");
                                    setSearchParams({ tab: "projects-case-studies", view: "case-studies" });
                                }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                <div className="relative flex items-center gap-3">
                                    <div className="rounded-lg bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 p-2 text-indigo-600">
                                        <FolderKanban className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-sm mb-0.5">Case Studies</h3>
                                        <p className="text-xs text-muted-foreground">Manage portfolio</p>
                                    </div>
                                </div>
                            </Card>
                            <Card
                                className="group relative overflow-hidden p-4 border-border/40 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10 hover:-translate-y-1 hover:border-cyan-300 cursor-pointer"
                                onClick={() => navigate("/admin/chat")}
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                <div className="relative flex items-center gap-3">
                                    <div className="rounded-lg bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 p-2 text-cyan-600">
                                        <MessageCircle className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-sm mb-0.5">Chat</h3>
                                        <p className="text-xs text-muted-foreground">Monitor conversations</p>
                                    </div>
                                </div>
                            </Card>
                        </div>

                        {/* Compact Analytics Overview */}
                        <div>
                            <h2 className="font-heading text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Analytics Overview</h2>
                            {isLoadingAnalytics ? (
                                <Card className="p-4">
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                    </div>
                                </Card>
                            ) : analytics && (
                                <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">
                                    <Card className="group relative overflow-hidden p-3 sm:p-4 border-border/40 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                        <div className="relative flex items-center justify-between">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs text-muted-foreground mb-1">Total Proposals</p>
                                                <p className="text-xl sm:text-2xl font-bold text-foreground">{analytics.proposals?.total || 0}</p>
                                            </div>
                                            <div className="ml-3 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-500/5 p-2 text-blue-600">
                                                <FileText className="h-5 w-5" />
                                            </div>
                                        </div>
                                    </Card>
                                    <Card className="group relative overflow-hidden p-3 sm:p-4 border-border/40 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                        <div className="relative flex items-center justify-between">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs text-muted-foreground mb-1">Total Projects</p>
                                                <p className="text-xl sm:text-2xl font-bold text-foreground">{analytics.projects?.total || 0}</p>
                                            </div>
                                            <div className="ml-3 rounded-lg bg-gradient-to-br from-purple-500/10 to-purple-500/5 p-2 text-purple-600">
                                                <Briefcase className="h-5 w-5" />
                                            </div>
                                        </div>
                                    </Card>
                                    <Card className="group relative overflow-hidden p-3 sm:p-4 border-border/40 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                                        <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                        <div className="relative flex items-center justify-between">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs text-muted-foreground mb-1">Total Users</p>
                                                <p className="text-xl sm:text-2xl font-bold text-foreground">{analytics.users?.total || 0}</p>
                                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                                    {analytics.users?.analysts || 0} Analysts, {analytics.users?.managers || 0} Managers
                                                </p>
                                            </div>
                                            <div className="ml-3 rounded-lg bg-gradient-to-br from-green-500/10 to-green-500/5 p-2 text-green-600">
                                                <Users className="h-5 w-5" />
                                            </div>
                                        </div>
                                    </Card>
                                    <Card className="group relative overflow-hidden p-3 sm:p-4 border-border/40 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                                        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                        <div className="relative flex items-center justify-between">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs text-muted-foreground mb-1">Approval Rate</p>
                                                <p className="text-xl sm:text-2xl font-bold text-foreground">{analytics.activity?.approval_rate || 0}%</p>
                                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                                    {analytics.activity?.recent_approvals || 0} approvals (7 days)
                                                </p>
                                            </div>
                                            <div className="ml-3 rounded-lg bg-gradient-to-br from-orange-500/10 to-orange-500/5 p-2 text-orange-600">
                                                <TrendingUp className="h-5 w-5" />
                                            </div>
                                        </div>
                                    </Card>
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    {/* PROPOSALS TAB */}
                    <TabsContent value="proposals" className="space-y-4 sm:space-y-6 mt-4">
                        {/* Compact Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div>
                                <h2 className="font-heading text-xl sm:text-2xl font-bold">Proposal Management</h2>
                                <p className="text-xs sm:text-sm text-muted-foreground">Review, approve, and manage all proposals</p>
                            </div>
                            <div className="relative w-full sm:w-auto">
                                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search proposals..."
                                    value={proposalSearchQuery}
                                    onChange={(e) => setProposalSearchQuery(e.target.value)}
                                    className="pl-8 w-full sm:w-64 h-9 text-sm bg-background/50"
                                />
                            </div>
                        </div>

                        {/* Compact Status Cards */}
                        <div className="grid gap-2 sm:gap-3 grid-cols-2 md:grid-cols-5">
                            <Card
                                className="group relative overflow-hidden p-3 border-border/40 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-yellow-300 cursor-pointer"
                                onClick={() => setProposalActiveTab("pending_approval")}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">Pending</p>
                                        <p className="text-lg sm:text-xl font-bold text-foreground">{statusCounts.pending_approval}</p>
                                    </div>
                                    <div className="ml-2 rounded bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 p-1.5 text-yellow-600">
                                        <Clock className="h-4 w-4" />
                                    </div>
                                </div>
                            </Card>
                            <Card
                                className="group relative overflow-hidden p-3 border-border/40 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-green-300 cursor-pointer"
                                onClick={() => setProposalActiveTab("approved")}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">Approved</p>
                                        <p className="text-lg sm:text-xl font-bold text-foreground">{statusCounts.approved}</p>
                                    </div>
                                    <div className="ml-2 rounded bg-gradient-to-br from-green-500/10 to-green-500/5 p-1.5 text-green-600">
                                        <CheckCircle className="h-4 w-4" />
                                    </div>
                                </div>
                            </Card>
                            <Card
                                className="group relative overflow-hidden p-3 border-border/40 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-red-300 cursor-pointer"
                                onClick={() => setProposalActiveTab("rejected")}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">Rejected</p>
                                        <p className="text-lg sm:text-xl font-bold text-foreground">{statusCounts.rejected}</p>
                                    </div>
                                    <div className="ml-2 rounded bg-gradient-to-br from-red-500/10 to-red-500/5 p-1.5 text-red-600">
                                        <XCircle className="h-4 w-4" />
                                    </div>
                                </div>
                            </Card>
                            <Card
                                className="group relative overflow-hidden p-3 border-border/40 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-blue-300 cursor-pointer"
                                onClick={() => setProposalActiveTab("on_hold")}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">On Hold</p>
                                        <p className="text-lg sm:text-xl font-bold text-foreground">{statusCounts.on_hold}</p>
                                    </div>
                                    <div className="ml-2 rounded bg-gradient-to-br from-blue-500/10 to-blue-500/5 p-1.5 text-blue-600">
                                        <FileText className="h-4 w-4" />
                                    </div>
                                </div>
                            </Card>
                            <Card
                                className="group relative overflow-hidden p-3 border-border/40 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-indigo-300 cursor-pointer col-span-2 md:col-span-1"
                                onClick={() => setProposalActiveTab("all")}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">Total</p>
                                        <p className="text-lg sm:text-xl font-bold text-foreground">{statusCounts.all}</p>
                                    </div>
                                    <div className="ml-2 rounded bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 p-1.5 text-indigo-600">
                                        <FileText className="h-4 w-4" />
                                    </div>
                                </div>
                            </Card>
                        </div>

                        {/* Proposals Table */}
                        <Card className="border-border/40 bg-card/80 backdrop-blur-sm shadow-sm">
                            <Tabs value={proposalActiveTab} onValueChange={setProposalActiveTab}>
                                <TabsList className="w-full justify-start rounded-none border-b bg-muted/30 h-9">
                                    <TabsTrigger value="pending_approval" className="text-xs">Pending ({statusCounts.pending_approval})</TabsTrigger>
                                    <TabsTrigger value="approved" className="text-xs">Approved ({statusCounts.approved})</TabsTrigger>
                                    <TabsTrigger value="rejected" className="text-xs">Rejected ({statusCounts.rejected})</TabsTrigger>
                                    <TabsTrigger value="on_hold" className="text-xs">On Hold ({statusCounts.on_hold})</TabsTrigger>
                                    <TabsTrigger value="all" className="text-xs">All ({statusCounts.all})</TabsTrigger>
                                </TabsList>

                                <TabsContent value={proposalActiveTab} className="p-3 sm:p-4">
                                    {isLoadingProposals ? (
                                        <div className="flex items-center justify-center py-8">
                                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                        </div>
                                    ) : filteredProposals.length === 0 ? (
                                        <div className="text-center py-8">
                                            <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                                            <p className="text-sm text-muted-foreground">
                                                {proposalSearchQuery ? "No proposals match your search" : "No proposals found"}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="h-9 text-xs">Title</TableHead>
                                                        <TableHead className="h-9 text-xs">Project ID</TableHead>
                                                        <TableHead className="h-9 text-xs">Status</TableHead>
                                                        <TableHead className="h-9 text-xs">Submitted</TableHead>
                                                        <TableHead className="h-9 text-xs">Message</TableHead>
                                                        <TableHead className="h-9 text-xs">Actions</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {filteredProposals.map((proposal) => (
                                                        <TableRow key={proposal.id}>
                                                            <TableCell className="text-sm font-medium">{proposal.title}</TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline" className="text-xs">#{proposal.project_id}</Badge>
                                                            </TableCell>
                                                            <TableCell>{getStatusBadge(proposal.status)}</TableCell>
                                                            <TableCell className="text-xs">
                                                                {proposal.submitted_at ? (
                                                                    <div className="flex flex-col">
                                                                        <span>{formatDistanceToNow(new Date(proposal.submitted_at), { addSuffix: true })}</span>
                                                                        <span className="text-muted-foreground">
                                                                            {format(new Date(proposal.submitted_at), "MMM d, yyyy")}
                                                                        </span>
                                                                    </div>
                                                                ) : (
                                                                    "N/A"
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="max-w-xs truncate text-xs">
                                                                {proposal.submitter_message || "No message"}
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex items-center gap-1.5">
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        className="h-7 text-xs px-2"
                                                                        onClick={async () => {
                                                                            try {
                                                                                const fullProposal = await apiClient.getAdminProposal(proposal.id);
                                                                                setSelectedProposal(fullProposal);
                                                                                setViewDialogOpen(true);
                                                                            } catch (error: any) {
                                                                                toast.error(error.message || "Failed to load proposal details");
                                                                            }
                                                                        }}
                                                                    >
                                                                        <Eye className="h-3 w-3 mr-1" />
                                                                        View
                                                                    </Button>
                                                                    {(proposal.status === "pending_approval" || proposal.status === "on_hold") && (
                                                                        <Button
                                                                            size="sm"
                                                                            className="h-7 text-xs px-2"
                                                                            onClick={() => {
                                                                                setSelectedProposal(proposal);
                                                                                setReviewDialogOpen(true);
                                                                            }}
                                                                        >
                                                                            Review
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    )}
                                </TabsContent>
                            </Tabs>
                        </Card>
                    </TabsContent>

                    {/* PROJECTS & CASE STUDIES TAB (COMBINED) */}
                    <TabsContent value="projects-case-studies" className="space-y-4 sm:space-y-6 mt-4">
                        {/* Sub-tabs for Projects vs Case Studies */}
                        <div className="flex items-center gap-2 border-b pb-2">
                            <Button
                                variant={projectsCaseStudiesView === "projects" ? "default" : "ghost"}
                                size="sm"
                                className="h-8 text-xs"
                                onClick={() => {
                                    setProjectsCaseStudiesView("projects");
                                    setSearchParams({ tab: "projects-case-studies", view: "projects" });
                                }}
                            >
                                <Briefcase className="h-3 w-3 mr-1.5" />
                                Projects
                            </Button>
                            <Button
                                variant={projectsCaseStudiesView === "case-studies" ? "default" : "ghost"}
                                size="sm"
                                className="h-8 text-xs"
                                onClick={() => {
                                    setProjectsCaseStudiesView("case-studies");
                                    setSearchParams({ tab: "projects-case-studies", view: "case-studies" });
                                }}
                            >
                                <FolderKanban className="h-3 w-3 mr-1.5" />
                                Case Studies
                            </Button>
                        </div>

                        {projectsCaseStudiesView === "projects" ? (
                            <>
                                {/* Projects Header */}
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                    <div>
                                        <h2 className="font-heading text-xl sm:text-2xl font-bold">Project Management</h2>
                                        <p className="text-xs sm:text-sm text-muted-foreground">View and manage all projects across users</p>
                                    </div>
                                    <div className="relative w-full sm:w-auto">
                                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search projects..."
                                            value={projectSearchQuery}
                                            onChange={(e) => setProjectSearchQuery(e.target.value)}
                                            className="pl-8 w-full sm:w-64 h-9 text-sm bg-background/50"
                                        />
                                    </div>
                                </div>

                                {/* Compact Stats Cards */}
                                <div className="grid gap-2 sm:gap-3 grid-cols-2 md:grid-cols-4">
                                    <Card className="group relative overflow-hidden p-3 border-border/40 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">Total</p>
                                                <p className="text-lg sm:text-xl font-bold text-foreground">{projectStats.total}</p>
                                            </div>
                                            <div className="ml-2 rounded bg-gradient-to-br from-blue-500/10 to-blue-500/5 p-1.5 text-blue-600">
                                                <Briefcase className="h-4 w-4" />
                                            </div>
                                        </div>
                                    </Card>
                                    <Card className="group relative overflow-hidden p-3 border-border/40 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">Active</p>
                                                <p className="text-lg sm:text-xl font-bold text-foreground">{projectStats.active}</p>
                                            </div>
                                            <div className="ml-2 rounded bg-gradient-to-br from-green-500/10 to-green-500/5 p-1.5 text-green-600">
                                                <Building2 className="h-4 w-4" />
                                            </div>
                                        </div>
                                    </Card>
                                    <Card className="group relative overflow-hidden p-3 border-border/40 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">Submitted</p>
                                                <p className="text-lg sm:text-xl font-bold text-foreground">{projectStats.submitted}</p>
                                            </div>
                                            <div className="ml-2 rounded bg-gradient-to-br from-purple-500/10 to-purple-500/5 p-1.5 text-purple-600">
                                                <Globe className="h-4 w-4" />
                                            </div>
                                        </div>
                                    </Card>
                                    <Card className="group relative overflow-hidden p-3 border-border/40 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">Completed</p>
                                                <p className="text-lg sm:text-xl font-bold text-foreground">{projectStats.completed}</p>
                                            </div>
                                            <div className="ml-2 rounded bg-gradient-to-br from-orange-500/10 to-orange-500/5 p-1.5 text-orange-600">
                                                <Briefcase className="h-4 w-4" />
                                            </div>
                                        </div>
                                    </Card>
                                </div>

                                {/* Compact Filters */}
                                <Card className="p-3 border-border/40 bg-card/80 backdrop-blur-sm shadow-sm">
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <div className="flex items-center gap-1.5">
                                            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                                            <span className="text-xs font-medium">Filters:</span>
                                        </div>
                                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                                            <SelectTrigger className="w-40 h-8 text-xs">
                                                <SelectValue placeholder="All Statuses" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Statuses</SelectItem>
                                                {statuses.map((status) => (
                                                    <SelectItem key={status} value={status}>
                                                        {status}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Select value={industryFilter} onValueChange={setIndustryFilter}>
                                            <SelectTrigger className="w-40 h-8 text-xs">
                                                <SelectValue placeholder="All Industries" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Industries</SelectItem>
                                                {industries.map((industry) => (
                                                    <SelectItem key={industry} value={industry}>
                                                        {industry}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </Card>

                                {/* Projects Table */}
                                <Card className="border-border/40 bg-card/80 backdrop-blur-sm shadow-sm">
                                    {isLoadingProjects ? (
                                        <div className="flex items-center justify-center py-8">
                                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                        </div>
                                    ) : filteredProjects.length === 0 ? (
                                        <div className="text-center py-8">
                                            <Briefcase className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                                            <p className="text-sm text-muted-foreground">
                                                {projectSearchQuery || statusFilter !== "all" || industryFilter !== "all"
                                                    ? "No projects match your filters"
                                                    : "No projects found"}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="h-9 text-xs">Project Name</TableHead>
                                                        <TableHead className="h-9 text-xs">Client</TableHead>
                                                        <TableHead className="h-9 text-xs">Industry</TableHead>
                                                        <TableHead className="h-9 text-xs">Region</TableHead>
                                                        <TableHead className="h-9 text-xs">Status</TableHead>
                                                        <TableHead className="h-9 text-xs">Type</TableHead>
                                                        <TableHead className="h-9 text-xs">Created</TableHead>
                                                        <TableHead className="h-9 text-xs">Actions</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {filteredProjects.map((project) => (
                                                        <TableRow key={project.id}>
                                                            <TableCell className="text-sm font-medium">{project.name}</TableCell>
                                                            <TableCell className="text-xs">{project.client_name}</TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline" className="text-xs">{project.industry}</Badge>
                                                            </TableCell>
                                                            <TableCell className="text-xs">{project.region}</TableCell>
                                                            <TableCell>
                                                                <Badge
                                                                    variant={
                                                                        project.status === "Active"
                                                                            ? "default"
                                                                            : project.status === "Completed"
                                                                            ? "secondary"
                                                                            : "outline"
                                                                    }
                                                                    className="text-xs"
                                                                >
                                                                    {project.status}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline" className="text-xs">{project.project_type}</Badge>
                                                            </TableCell>
                                                            <TableCell className="text-xs">
                                                                {format(new Date(project.created_at), "MMM d, yyyy")}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="h-7 text-xs px-2"
                                                                    onClick={() => {
                                                                        setSelectedProject(project);
                                                                        setProjectViewDialogOpen(true);
                                                                    }}
                                                                >
                                                                    <Eye className="h-3 w-3 mr-1" />
                                                                    View
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    )}
                                </Card>
                            </>
                        ) : (
                            <>
                                {/* Case Studies Header */}
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                    <div>
                                        <h2 className="font-heading text-xl sm:text-2xl font-bold">Case Study Management</h2>
                                        <p className="text-xs sm:text-sm text-muted-foreground">View and manage all case studies</p>
                                    </div>
                                    <div className="relative w-full sm:w-auto">
                                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search case studies..."
                                            value={caseStudySearchQuery}
                                            onChange={(e) => setCaseStudySearchQuery(e.target.value)}
                                            className="pl-8 w-full sm:w-64 h-9 text-sm bg-background/50"
                                        />
                                    </div>
                                </div>

                                {/* Compact Stats Cards */}
                                <div className="grid gap-2 sm:gap-3 grid-cols-1 md:grid-cols-2">
                                    <Card className="group relative overflow-hidden p-3 border-border/40 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">Total Case Studies</p>
                                                <p className="text-lg sm:text-xl font-bold text-foreground">{caseStudyStats.total}</p>
                                            </div>
                                            <div className="ml-2 rounded bg-gradient-to-br from-blue-500/10 to-blue-500/5 p-1.5 text-blue-600">
                                                <FolderKanban className="h-4 w-4" />
                                            </div>
                                        </div>
                                    </Card>
                                    <Card className="group relative overflow-hidden p-3 border-border/40 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">Indexed in RAG</p>
                                                <p className="text-lg sm:text-xl font-bold text-foreground">{caseStudyStats.indexed}</p>
                                            </div>
                                            <div className="ml-2 rounded bg-gradient-to-br from-green-500/10 to-green-500/5 p-1.5 text-green-600">
                                                <Building2 className="h-4 w-4" />
                                            </div>
                                        </div>
                                    </Card>
                                </div>

                                {/* Compact Filters */}
                                {caseStudyIndustries.length > 0 && (
                                    <Card className="p-3 border-border/40 bg-card/80 backdrop-blur-sm shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-1.5">
                                                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                                                <span className="text-xs font-medium">Filter:</span>
                                            </div>
                                            <Select value={caseStudyIndustryFilter} onValueChange={setCaseStudyIndustryFilter}>
                                                <SelectTrigger className="w-40 h-8 text-xs">
                                                    <SelectValue placeholder="All Industries" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">All Industries</SelectItem>
                                                    {caseStudyIndustries.map((industry) => (
                                                        <SelectItem key={industry} value={industry}>
                                                            {industry}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </Card>
                                )}

                                {/* Case Studies Table */}
                                <Card className="border-border/40 bg-card/80 backdrop-blur-sm shadow-sm">
                                    {isLoadingCaseStudies ? (
                                        <div className="flex items-center justify-center py-8">
                                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                        </div>
                                    ) : filteredCaseStudies.length === 0 ? (
                                        <div className="text-center py-8">
                                            <FolderKanban className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                                            <p className="text-sm text-muted-foreground">
                                                {caseStudySearchQuery || caseStudyIndustryFilter !== "all"
                                                    ? "No case studies match your filters"
                                                    : "No case studies found"}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="h-9 text-xs">Title</TableHead>
                                                        <TableHead className="h-9 text-xs">Industry</TableHead>
                                                        <TableHead className="h-9 text-xs">Impact</TableHead>
                                                        <TableHead className="h-9 text-xs">Status</TableHead>
                                                        <TableHead className="h-9 text-xs">Created</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {filteredCaseStudies.map((cs: any) => (
                                                        <TableRow key={cs.id}>
                                                            <TableCell className="text-sm font-medium">{cs.title}</TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline" className="text-xs">{cs.industry || "N/A"}</Badge>
                                                            </TableCell>
                                                            <TableCell className="max-w-xs truncate text-xs">
                                                                {cs.impact || "N/A"}
                                                            </TableCell>
                                                            <TableCell>
                                                                {cs.indexed ? (
                                                                    <Badge variant="default" className="text-xs">Indexed</Badge>
                                                                ) : (
                                                                    <Badge variant="outline" className="text-xs">Not Indexed</Badge>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="text-xs">
                                                                {cs.created_at
                                                                    ? format(new Date(cs.created_at), "MMM d, yyyy")
                                                                    : "N/A"}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    )}
                                </Card>
                            </>
                        )}
                    </TabsContent>
                </Tabs>
            </div>

            {/* Review Proposal Dialog */}
            <Dialog
                open={reviewDialogOpen}
                onOpenChange={(open) => {
                    setReviewDialogOpen(open);
                    if (!open) {
                        setPendingAction(null);
                    }
                }}
            >
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Review Proposal</DialogTitle>
                        <DialogDescription>
                            {selectedProposal?.status === "on_hold"
                                ? `Update proposal from On Hold status: ${selectedProposal?.title}`
                                : `Review and provide feedback for: ${selectedProposal?.title}`}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div>
                            <p className="text-sm font-medium mb-1">Submitter Message:</p>
                            <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                                {selectedProposal?.submitter_message || "No message provided"}
                            </p>
                        </div>

                        <div>
                            <p className="text-sm font-medium mb-1">Your Feedback (Optional):</p>
                            <Textarea
                                placeholder="Provide feedback or comments..."
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                rows={4}
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setReviewDialogOpen(false)}
                            disabled={reviewMutation.isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => handleReview("reject")}
                            disabled={reviewMutation.isPending}
                        >
                            {pendingAction === "reject" && reviewMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Reject
                        </Button>
                        {selectedProposal?.status !== "on_hold" && (
                            <Button
                                variant="secondary"
                                onClick={() => handleReview("hold")}
                                disabled={reviewMutation.isPending}
                            >
                                {pendingAction === "hold" && reviewMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Hold
                            </Button>
                        )}
                        <Button
                            onClick={() => handleReview("approve")}
                            disabled={reviewMutation.isPending}
                        >
                            {pendingAction === "approve" && reviewMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Approve
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* View Proposal Dialog */}
            <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
                <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
                    <DialogHeader className="flex-shrink-0">
                        <DialogTitle>{selectedProposal?.title}</DialogTitle>
                        <DialogDescription>Proposal Details and Preview</DialogDescription>
                    </DialogHeader>

                    <ScrollArea className="h-[calc(90vh-180px)] pr-4">
                        <div className="space-y-6 py-2">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm font-medium mb-1">Status:</p>
                                    <div>{selectedProposal && getStatusBadge(selectedProposal.status)}</div>
                                </div>
                                <div>
                                    <p className="text-sm font-medium mb-1">Project ID:</p>
                                    <Badge variant="outline">#{selectedProposal?.project_id}</Badge>
                                </div>
                                {selectedProposal?.template_type && (
                                    <div>
                                        <p className="text-sm font-medium mb-1">Template Type:</p>
                                        <p className="text-sm text-muted-foreground capitalize">
                                            {selectedProposal.template_type}
                                        </p>
                                    </div>
                                )}
                                {selectedProposal?.submitted_at && (
                                    <div>
                                        <p className="text-sm font-medium mb-1">Submitted:</p>
                                        <p className="text-sm text-muted-foreground">
                                            {format(new Date(selectedProposal.submitted_at), "PPpp")}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {selectedProposal?.reviewed_at && (
                                <div>
                                    <p className="text-sm font-medium mb-1">Reviewed:</p>
                                    <p className="text-sm text-muted-foreground">
                                        {format(new Date(selectedProposal.reviewed_at), "PPpp")}
                                    </p>
                                </div>
                            )}

                            {selectedProposal?.submitter_message && (
                                <div>
                                    <p className="text-sm font-medium mb-1">Submitter Message:</p>
                                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                                        {selectedProposal.submitter_message}
                                    </p>
                                </div>
                            )}

                            {selectedProposal?.admin_feedback && (
                                <div>
                                    <p className="text-sm font-medium mb-1">Admin Feedback:</p>
                                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                                        {selectedProposal.admin_feedback}
                                    </p>
                                </div>
                            )}

                            {selectedProposal?.sections && Array.isArray(selectedProposal.sections) && selectedProposal.sections.length > 0 && (
                                <div className="space-y-4">
                                    <div className="border-t pt-4">
                                        <h3 className="text-lg font-semibold mb-4">Proposal Content</h3>
                                        <div className="space-y-6">
                                            {selectedProposal.sections.map((section: any, index: number) => (
                                                <Card key={section.id || index} className="p-4">
                                                    <h4 className="font-semibold text-base mb-3 text-foreground">
                                                        {section.title || `Section ${index + 1}`}
                                                    </h4>
                                                    {section.content ? (
                                                        <div className="prose prose-sm max-w-none">
                                                            <MarkdownText
                                                                content={section.content}
                                                                className="text-foreground/90"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm text-muted-foreground italic">No content available</p>
                                                    )}
                                                </Card>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {(!selectedProposal?.sections || (Array.isArray(selectedProposal.sections) && selectedProposal.sections.length === 0)) && (
                                <div className="text-center py-8 text-muted-foreground">
                                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p>No proposal content available</p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* View Project Dialog */}
            <Dialog open={projectViewDialogOpen} onOpenChange={setProjectViewDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Project Details</DialogTitle>
                        <DialogDescription>Admin view - Read-only project information</DialogDescription>
                    </DialogHeader>

                    {isLoadingDetails ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : projectDetails ? (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm font-medium mb-1">Project Name</p>
                                    <p className="text-sm text-muted-foreground">{projectDetails.name}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium mb-1">Client Name</p>
                                    <p className="text-sm text-muted-foreground">{projectDetails.client_name}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium mb-1">Industry</p>
                                    <Badge variant="outline">{projectDetails.industry}</Badge>
                                </div>
                                <div>
                                    <p className="text-sm font-medium mb-1">Region</p>
                                    <p className="text-sm text-muted-foreground">{projectDetails.region}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium mb-1">Project Type</p>
                                    <Badge variant="outline">{projectDetails.project_type}</Badge>
                                </div>
                                <div>
                                    <p className="text-sm font-medium mb-1">Status</p>
                                    <Badge
                                        variant={
                                            projectDetails.status === "Active"
                                                ? "default"
                                                : projectDetails.status === "Completed"
                                                ? "secondary"
                                                : "outline"
                                        }
                                    >
                                        {projectDetails.status}
                                    </Badge>
                                </div>
                                <div>
                                    <p className="text-sm font-medium mb-1">Created</p>
                                    <p className="text-sm text-muted-foreground">
                                        {format(new Date(projectDetails.created_at), "PPpp")}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium mb-1">Last Updated</p>
                                    <p className="text-sm text-muted-foreground">
                                        {format(new Date(projectDetails.updated_at), "PPpp")}
                                    </p>
                                </div>
                            </div>
                            {projectDetails.description && (
                                <div>
                                    <p className="text-sm font-medium mb-1">Description</p>
                                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                                        {projectDetails.description}
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <p className="text-muted-foreground">Failed to load project details</p>
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setProjectViewDialogOpen(false);
                                setSelectedProject(null);
                            }}
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
