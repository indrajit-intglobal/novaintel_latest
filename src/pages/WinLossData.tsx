import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  TrendingUp,
  TrendingDown,
  Loader2,
  Calendar,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, WinLossData, WinLossDataCreate, WinLossDataUpdate } from "@/lib/api";
import { toast } from "sonner";
import { useState } from "react";
import { format } from "date-fns";

const INDUSTRIES = [
  "BFSI",
  "Retail",
  "Healthcare",
  "Technology",
  "Manufacturing",
  "Education",
  "Government",
  "Other",
];

const REGIONS = [
  "North America",
  "South America",
  "Europe",
  "Asia Pacific",
  "Middle East",
  "Africa",
];

const OUTCOMES = [
  { value: "won", label: "Won", color: "bg-green-100 text-green-700" },
  { value: "lost", label: "Lost", color: "bg-red-100 text-red-700" },
  { value: "no_decision", label: "No Decision", color: "bg-yellow-100 text-yellow-700" },
  { value: "cancelled", label: "Cancelled", color: "bg-gray-100 text-gray-700" },
];

export default function WinLossDataPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<WinLossData | null>(null);
  const [formData, setFormData] = useState<WinLossDataCreate>({
    deal_id: "",
    client_name: "",
    industry: "",
    region: "",
    competitor: "",
    competitors: [],
    outcome: "won",
    deal_size: undefined,
    deal_date: "",
    win_reasons: "",
    loss_reasons: "",
    rfp_characteristics: {},
  });
  const [competitorInput, setCompetitorInput] = useState("");
  const queryClient = useQueryClient();

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["win-loss-data"],
    queryFn: () => apiClient.listWinLossData(100),
  });

  const createMutation = useMutation({
    mutationFn: (data: WinLossDataCreate) => apiClient.createWinLossData(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["win-loss-data"] });
      toast.success("Win/Loss record created successfully");
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create win/loss record");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: WinLossDataUpdate }) =>
      apiClient.updateWinLossData(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["win-loss-data"] });
      toast.success("Win/Loss record updated successfully");
      setIsEditOpen(false);
      setSelectedRecord(null);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update win/loss record");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (recordId: number) => apiClient.deleteWinLossData(recordId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["win-loss-data"] });
      toast.success("Win/Loss record deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete win/loss record");
    },
  });

  const resetForm = () => {
    setFormData({
      deal_id: "",
      client_name: "",
      industry: "",
      region: "",
      competitor: "",
      competitors: [],
      outcome: "won",
      deal_size: undefined,
      deal_date: "",
      win_reasons: "",
      loss_reasons: "",
      rfp_characteristics: {},
    });
    setCompetitorInput("");
  };

  const handleCreate = () => {
    if (!formData.client_name.trim()) {
      toast.error("Client name is required");
      return;
    }
    createMutation.mutate(formData);
  };

  const handleEdit = (record: WinLossData) => {
    setSelectedRecord(record);
    setFormData({
      deal_id: record.deal_id || "",
      client_name: record.client_name,
      industry: record.industry || "",
      region: record.region || "",
      competitor: record.competitor || "",
      competitors: record.competitors || [],
      outcome: record.outcome,
      deal_size: record.deal_size,
      deal_date: record.deal_date ? format(new Date(record.deal_date), "yyyy-MM-dd") : "",
      win_reasons: record.win_reasons || "",
      loss_reasons: record.loss_reasons || "",
      rfp_characteristics: record.rfp_characteristics || {},
    });
    setIsEditOpen(true);
  };

  const handleUpdate = () => {
    if (!formData.client_name?.trim()) {
      toast.error("Client name is required");
      return;
    }
    if (!selectedRecord) return;
    updateMutation.mutate({ id: selectedRecord.id, data: formData });
  };

  const handleDelete = (record: WinLossData) => {
    if (confirm(`Are you sure you want to delete the record for "${record.client_name}"?`)) {
      deleteMutation.mutate(record.id);
    }
  };

  const addCompetitor = () => {
    if (competitorInput.trim()) {
      setFormData({
        ...formData,
        competitors: [...(formData.competitors || []), competitorInput.trim()],
      });
      setCompetitorInput("");
    }
  };

  const removeCompetitor = (competitor: string) => {
    setFormData({
      ...formData,
      competitors: (formData.competitors || []).filter((c) => c !== competitor),
    });
  };

  const getOutcomeBadge = (outcome: string) => {
    const outcomeData = OUTCOMES.find((o) => o.value === outcome);
    return outcomeData || OUTCOMES[0];
  };

  const filteredRecords = records.filter((record) =>
    record.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (record.industry && record.industry.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (record.deal_id && record.deal_id.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Calculate statistics
  const stats = {
    total: filteredRecords.length,
    won: filteredRecords.filter((r) => r.outcome === "won").length,
    lost: filteredRecords.filter((r) => r.outcome === "lost").length,
    winRate: filteredRecords.length > 0
      ? ((filteredRecords.filter((r) => r.outcome === "won").length / filteredRecords.length) * 100).toFixed(1)
      : "0",
    totalDealSize: filteredRecords.reduce((sum, r) => sum + (r.deal_size || 0), 0),
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-3xl font-bold">Win/Loss Data</h1>
            <p className="text-muted-foreground mt-1">
              Track historical deal outcomes to improve Go/No-Go analysis accuracy
            </p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Record
          </Button>
        </div>

        {/* Statistics */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Total Deals</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Won</div>
            <div className="text-2xl font-bold text-green-600">{stats.won}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Lost</div>
            <div className="text-2xl font-bold text-red-600">{stats.lost}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Win Rate</div>
            <div className="text-2xl font-bold">{stats.winRate}%</div>
          </Card>
        </div>

        {/* Search */}
        <Card className="p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by client name, industry, or deal ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </Card>

        {/* Records Table */}
        {isLoading ? (
          <Card className="p-8">
            <div className="flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          </Card>
        ) : filteredRecords.length === 0 ? (
          <Card className="p-8">
            <div className="text-center">
              <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">No Win/Loss Records</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first win/loss record to start tracking deal outcomes.
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Record
              </Button>
            </div>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Industry</TableHead>
                    <TableHead>Outcome</TableHead>
                    <TableHead>Deal Size</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Competitor</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => {
                    const outcomeBadge = getOutcomeBadge(record.outcome);
                    return (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.client_name}</TableCell>
                        <TableCell>
                          {record.industry ? (
                            <Badge variant="secondary">{record.industry}</Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={outcomeBadge.color}>
                            {outcomeBadge.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {record.deal_size ? `$${record.deal_size.toLocaleString()}` : "-"}
                        </TableCell>
                        <TableCell>
                          {record.deal_date
                            ? format(new Date(record.deal_date), "MMM dd, yyyy")
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {record.competitor || (record.competitors && record.competitors.length > 0
                            ? record.competitors.join(", ")
                            : "-")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(record)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(record)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}

        {/* Create Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Win/Loss Record</DialogTitle>
              <DialogDescription>
                Record the outcome of a deal to improve future Go/No-Go analysis.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="client_name">Client Name *</Label>
                <Input
                  id="client_name"
                  value={formData.client_name}
                  onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                  placeholder="e.g., Acme Corporation"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="deal_id">Deal ID</Label>
                  <Input
                    id="deal_id"
                    value={formData.deal_id}
                    onChange={(e) => setFormData({ ...formData, deal_id: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <Label htmlFor="outcome">Outcome *</Label>
                  <Select
                    value={formData.outcome}
                    onValueChange={(value: any) => setFormData({ ...formData, outcome: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OUTCOMES.map((outcome) => (
                        <SelectItem key={outcome.value} value={outcome.value}>
                          {outcome.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="industry">Industry</Label>
                  <Select
                    value={formData.industry}
                    onValueChange={(value) => setFormData({ ...formData, industry: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDUSTRIES.map((ind) => (
                        <SelectItem key={ind} value={ind}>
                          {ind}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="region">Region</Label>
                  <Select
                    value={formData.region}
                    onValueChange={(value) => setFormData({ ...formData, region: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                    <SelectContent>
                      {REGIONS.map((reg) => (
                        <SelectItem key={reg} value={reg}>
                          {reg}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="deal_size">Deal Size ($)</Label>
                  <Input
                    id="deal_size"
                    type="number"
                    value={formData.deal_size || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        deal_size: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                    placeholder="e.g., 100000"
                  />
                </div>
                <div>
                  <Label htmlFor="deal_date">Deal Date</Label>
                  <Input
                    id="deal_date"
                    type="date"
                    value={formData.deal_date}
                    onChange={(e) => setFormData({ ...formData, deal_date: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="competitor">Primary Competitor</Label>
                <Input
                  id="competitor"
                  value={formData.competitor}
                  onChange={(e) => setFormData({ ...formData, competitor: e.target.value })}
                  placeholder="e.g., Competitor Inc."
                />
              </div>
              <div>
                <Label>Additional Competitors</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={competitorInput}
                    onChange={(e) => setCompetitorInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCompetitor();
                      }
                    }}
                    placeholder="Add competitor"
                  />
                  <Button type="button" onClick={addCompetitor} variant="outline">
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(formData.competitors || []).map((comp) => (
                    <Badge key={comp} variant="secondary" className="cursor-pointer" onClick={() => removeCompetitor(comp)}>
                      {comp} ×
                    </Badge>
                  ))}
                </div>
              </div>
              {formData.outcome === "won" && (
                <div>
                  <Label htmlFor="win_reasons">Win Reasons</Label>
                  <Textarea
                    id="win_reasons"
                    value={formData.win_reasons}
                    onChange={(e) => setFormData({ ...formData, win_reasons: e.target.value })}
                    placeholder="What factors led to winning this deal?"
                    rows={3}
                  />
                </div>
              )}
              {formData.outcome === "lost" && (
                <div>
                  <Label htmlFor="loss_reasons">Loss Reasons</Label>
                  <Textarea
                    id="loss_reasons"
                    value={formData.loss_reasons}
                    onChange={(e) => setFormData({ ...formData, loss_reasons: e.target.value })}
                    placeholder="What factors led to losing this deal?"
                    rows={3}
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Win/Loss Record</DialogTitle>
              <DialogDescription>
                Update the deal outcome information.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-client_name">Client Name *</Label>
                <Input
                  id="edit-client_name"
                  value={formData.client_name || ""}
                  onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                  placeholder="e.g., Acme Corporation"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-deal_id">Deal ID</Label>
                  <Input
                    id="edit-deal_id"
                    value={formData.deal_id || ""}
                    onChange={(e) => setFormData({ ...formData, deal_id: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-outcome">Outcome *</Label>
                  <Select
                    value={formData.outcome}
                    onValueChange={(value: any) => setFormData({ ...formData, outcome: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OUTCOMES.map((outcome) => (
                        <SelectItem key={outcome.value} value={outcome.value}>
                          {outcome.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-industry">Industry</Label>
                  <Select
                    value={formData.industry || ""}
                    onValueChange={(value) => setFormData({ ...formData, industry: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDUSTRIES.map((ind) => (
                        <SelectItem key={ind} value={ind}>
                          {ind}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-region">Region</Label>
                  <Select
                    value={formData.region || ""}
                    onValueChange={(value) => setFormData({ ...formData, region: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                    <SelectContent>
                      {REGIONS.map((reg) => (
                        <SelectItem key={reg} value={reg}>
                          {reg}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-deal_size">Deal Size ($)</Label>
                  <Input
                    id="edit-deal_size"
                    type="number"
                    value={formData.deal_size || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        deal_size: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                    placeholder="e.g., 100000"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-deal_date">Deal Date</Label>
                  <Input
                    id="edit-deal_date"
                    type="date"
                    value={formData.deal_date}
                    onChange={(e) => setFormData({ ...formData, deal_date: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit-competitor">Primary Competitor</Label>
                <Input
                  id="edit-competitor"
                  value={formData.competitor || ""}
                  onChange={(e) => setFormData({ ...formData, competitor: e.target.value })}
                  placeholder="e.g., Competitor Inc."
                />
              </div>
              <div>
                <Label>Additional Competitors</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={competitorInput}
                    onChange={(e) => setCompetitorInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCompetitor();
                      }
                    }}
                    placeholder="Add competitor"
                  />
                  <Button type="button" onClick={addCompetitor} variant="outline">
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(formData.competitors || []).map((comp) => (
                    <Badge key={comp} variant="secondary" className="cursor-pointer" onClick={() => removeCompetitor(comp)}>
                      {comp} ×
                    </Badge>
                  ))}
                </div>
              </div>
              {formData.outcome === "won" && (
                <div>
                  <Label htmlFor="edit-win_reasons">Win Reasons</Label>
                  <Textarea
                    id="edit-win_reasons"
                    value={formData.win_reasons || ""}
                    onChange={(e) => setFormData({ ...formData, win_reasons: e.target.value })}
                    placeholder="What factors led to winning this deal?"
                    rows={3}
                  />
                </div>
              )}
              {formData.outcome === "lost" && (
                <div>
                  <Label htmlFor="edit-loss_reasons">Loss Reasons</Label>
                  <Textarea
                    id="edit-loss_reasons"
                    value={formData.loss_reasons || ""}
                    onChange={(e) => setFormData({ ...formData, loss_reasons: e.target.value })}
                    placeholder="What factors led to losing this deal?"
                    rows={3}
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleUpdate}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

