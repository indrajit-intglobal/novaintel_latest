import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Target,
  Loader2,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, ICPProfile, ICPProfileCreate, ICPProfileUpdate } from "@/lib/api";
import { toast } from "sonner";
import { useState } from "react";

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

export default function ICPProfiles() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<ICPProfile | null>(null);
  const [formData, setFormData] = useState<ICPProfileCreate>({
    name: "",
    industry: "",
    company_size_min: undefined,
    company_size_max: undefined,
    tech_stack: [],
    budget_range_min: undefined,
    budget_range_max: undefined,
    geographic_regions: [],
    additional_criteria: {},
  });
  const [techStackInput, setTechStackInput] = useState("");
  const queryClient = useQueryClient();

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["icp-profiles"],
    queryFn: () => apiClient.listICPProfiles(),
  });

  const createMutation = useMutation({
    mutationFn: (data: ICPProfileCreate) => apiClient.createICPProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["icp-profiles"] });
      toast.success("ICP profile created successfully");
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create ICP profile");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ICPProfileUpdate }) =>
      apiClient.updateICPProfile(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["icp-profiles"] });
      toast.success("ICP profile updated successfully");
      setIsEditOpen(false);
      setSelectedProfile(null);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update ICP profile");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (profileId: number) => apiClient.deleteICPProfile(profileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["icp-profiles"] });
      toast.success("ICP profile deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete ICP profile");
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      industry: "",
      company_size_min: undefined,
      company_size_max: undefined,
      tech_stack: [],
      budget_range_min: undefined,
      budget_range_max: undefined,
      geographic_regions: [],
      additional_criteria: {},
    });
    setTechStackInput("");
  };

  const handleCreate = () => {
    if (!formData.name.trim()) {
      toast.error("Name is required");
      return;
    }
    createMutation.mutate(formData);
  };

  const handleEdit = (profile: ICPProfile) => {
    setSelectedProfile(profile);
    setFormData({
      name: profile.name,
      industry: profile.industry || "",
      company_size_min: profile.company_size_min,
      company_size_max: profile.company_size_max,
      tech_stack: profile.tech_stack || [],
      budget_range_min: profile.budget_range_min,
      budget_range_max: profile.budget_range_max,
      geographic_regions: profile.geographic_regions || [],
      additional_criteria: profile.additional_criteria || {},
    });
    setIsEditOpen(true);
  };

  const handleUpdate = () => {
    if (!formData.name?.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!selectedProfile) return;
    updateMutation.mutate({ id: selectedProfile.id, data: formData });
  };

  const handleDelete = (profile: ICPProfile) => {
    if (confirm(`Are you sure you want to delete "${profile.name}"?`)) {
      deleteMutation.mutate(profile.id);
    }
  };

  const addTechStack = () => {
    if (techStackInput.trim()) {
      setFormData({
        ...formData,
        tech_stack: [...(formData.tech_stack || []), techStackInput.trim()],
      });
      setTechStackInput("");
    }
  };

  const removeTechStack = (item: string) => {
    setFormData({
      ...formData,
      tech_stack: (formData.tech_stack || []).filter((t) => t !== item),
    });
  };

  const toggleRegion = (region: string) => {
    const regions = formData.geographic_regions || [];
    if (regions.includes(region)) {
      setFormData({
        ...formData,
        geographic_regions: regions.filter((r) => r !== region),
      });
    } else {
      setFormData({
        ...formData,
        geographic_regions: [...regions, region],
      });
    }
  };

  const filteredProfiles = profiles.filter((profile) =>
    profile.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (profile.industry && profile.industry.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-3xl font-bold">ICP Profiles</h1>
            <p className="text-muted-foreground mt-1">
              Define your Ideal Customer Profiles to guide Go/No-Go analysis
            </p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New ICP Profile
          </Button>
        </div>

        {/* Search */}
        <Card className="p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search profiles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </Card>

        {/* Profiles List */}
        {isLoading ? (
          <Card className="p-8">
            <div className="flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          </Card>
        ) : filteredProfiles.length === 0 ? (
          <Card className="p-8">
            <div className="text-center">
              <Target className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">No ICP Profiles</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first ICP profile to get started with Go/No-Go analysis.
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create ICP Profile
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredProfiles.map((profile) => (
              <Card key={profile.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">{profile.name}</h3>
                    {profile.industry && (
                      <Badge variant="secondary" className="mb-2">
                        {profile.industry}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(profile)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(profile)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  {profile.company_size_min && profile.company_size_max && (
                    <div>
                      <span className="text-muted-foreground">Company Size: </span>
                      <span>{profile.company_size_min.toLocaleString()} - {profile.company_size_max.toLocaleString()}</span>
                    </div>
                  )}
                  {profile.budget_range_min && profile.budget_range_max && (
                    <div>
                      <span className="text-muted-foreground">Budget: </span>
                      <span>${profile.budget_range_min.toLocaleString()} - ${profile.budget_range_max.toLocaleString()}</span>
                    </div>
                  )}
                  {profile.tech_stack && profile.tech_stack.length > 0 && (
                    <div>
                      <span className="text-muted-foreground">Tech Stack: </span>
                      <span>{profile.tech_stack.slice(0, 3).join(", ")}{profile.tech_stack.length > 3 ? "..." : ""}</span>
                    </div>
                  )}
                  {profile.geographic_regions && profile.geographic_regions.length > 0 && (
                    <div>
                      <span className="text-muted-foreground">Regions: </span>
                      <span>{profile.geographic_regions.slice(0, 2).join(", ")}{profile.geographic_regions.length > 2 ? "..." : ""}</span>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Create Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create ICP Profile</DialogTitle>
              <DialogDescription>
                Define the characteristics of your ideal customer profile.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Enterprise Healthcare"
                />
              </div>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="company_size_min">Company Size Min</Label>
                  <Input
                    id="company_size_min"
                    type="number"
                    value={formData.company_size_min || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        company_size_min: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                    placeholder="e.g., 1000"
                  />
                </div>
                <div>
                  <Label htmlFor="company_size_max">Company Size Max</Label>
                  <Input
                    id="company_size_max"
                    type="number"
                    value={formData.company_size_max || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        company_size_max: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                    placeholder="e.g., 10000"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="budget_range_min">Budget Min ($)</Label>
                  <Input
                    id="budget_range_min"
                    type="number"
                    value={formData.budget_range_min || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        budget_range_min: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                    placeholder="e.g., 100000"
                  />
                </div>
                <div>
                  <Label htmlFor="budget_range_max">Budget Max ($)</Label>
                  <Input
                    id="budget_range_max"
                    type="number"
                    value={formData.budget_range_max || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        budget_range_max: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                    placeholder="e.g., 1000000"
                  />
                </div>
              </div>
              <div>
                <Label>Tech Stack</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={techStackInput}
                    onChange={(e) => setTechStackInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTechStack();
                      }
                    }}
                    placeholder="Add technology"
                  />
                  <Button type="button" onClick={addTechStack} variant="outline">
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(formData.tech_stack || []).map((tech) => (
                    <Badge key={tech} variant="secondary" className="cursor-pointer" onClick={() => removeTechStack(tech)}>
                      {tech} ×
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <Label>Geographic Regions</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {REGIONS.map((region) => (
                    <div key={region} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`region-${region}`}
                        checked={(formData.geographic_regions || []).includes(region)}
                        onChange={() => toggleRegion(region)}
                        className="rounded"
                      />
                      <Label htmlFor={`region-${region}`} className="cursor-pointer">
                        {region}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
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
              <DialogTitle>Edit ICP Profile</DialogTitle>
              <DialogDescription>
                Update the characteristics of your ideal customer profile.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Enterprise Healthcare"
                />
              </div>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-company_size_min">Company Size Min</Label>
                  <Input
                    id="edit-company_size_min"
                    type="number"
                    value={formData.company_size_min || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        company_size_min: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                    placeholder="e.g., 1000"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-company_size_max">Company Size Max</Label>
                  <Input
                    id="edit-company_size_max"
                    type="number"
                    value={formData.company_size_max || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        company_size_max: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                    placeholder="e.g., 10000"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-budget_range_min">Budget Min ($)</Label>
                  <Input
                    id="edit-budget_range_min"
                    type="number"
                    value={formData.budget_range_min || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        budget_range_min: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                    placeholder="e.g., 100000"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-budget_range_max">Budget Max ($)</Label>
                  <Input
                    id="edit-budget_range_max"
                    type="number"
                    value={formData.budget_range_max || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        budget_range_max: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                    placeholder="e.g., 1000000"
                  />
                </div>
              </div>
              <div>
                <Label>Tech Stack</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={techStackInput}
                    onChange={(e) => setTechStackInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTechStack();
                      }
                    }}
                    placeholder="Add technology"
                  />
                  <Button type="button" onClick={addTechStack} variant="outline">
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(formData.tech_stack || []).map((tech) => (
                    <Badge key={tech} variant="secondary" className="cursor-pointer" onClick={() => removeTechStack(tech)}>
                      {tech} ×
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <Label>Geographic Regions</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {REGIONS.map((region) => (
                    <div key={region} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`edit-region-${region}`}
                        checked={(formData.geographic_regions || []).includes(region)}
                        onChange={() => toggleRegion(region)}
                        className="rounded"
                      />
                      <Label htmlFor={`edit-region-${region}`} className="cursor-pointer">
                        {region}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
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

