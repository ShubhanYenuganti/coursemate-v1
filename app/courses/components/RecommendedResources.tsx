import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RefreshCw, ExternalLink, Plus, Loader2, AlertCircle, Star, BookOpen, Video, FileText, Code, Globe } from "lucide-react";
import type { Course } from "@/contexts/course-context";

const API_BASE_URL = "https://resource-scraper-api.vercel.app";

export default function RecommendedResources({ course }: { course: Course }) {
  const [resourceTypes, setResourceTypes] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchResourceTypes();
  }, []);

  useEffect(() => {
    if (resourceTypes.length > 0) {
      fetchResources(false);
    }
    // eslint-disable-next-line
  }, [resourceTypes, selectedTypes]);

  const fetchResourceTypes = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/resource-types`);
      const data = await response.json();
      let types: string[] = [];
      if (data.resource_types && Array.isArray(data.resource_types)) {
        types = data.resource_types;
      } else if (Array.isArray(data)) {
        types = data;
      }
      setResourceTypes(types.length ? types : ["video", "course", "documentation", "practice"]);
    } catch {
      setResourceTypes(["video", "course", "documentation", "practice"]);
      setError("Unable to connect to the resource API. Using default resource types.");
    }
  };

  const fetchResources = async (isRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: "Intro to Jave Programming",
          ...(selectedTypes.length > 0 && { resource_types: selectedTypes }),
          refresh: isRefresh,
          limit: isRefresh ? 10 : 5,
        }),
      });
      const data = await response.json();
      let resourcesArray: any[] = [];
      if (data.resources && Array.isArray(data.resources)) {
        resourcesArray = data.resources;
      } else if (Array.isArray(data)) {
        resourcesArray = data;
      }
      setResources(resourcesArray.slice(0, 5));
    } catch {
      setError("Failed to fetch resources from API. Please check your connection.");
      setResources([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTypeToggle = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type.toLowerCase()] 
    );
  };

  const handleAddResource = (resource: any) => {
    const key = `course-resources-${course.id}`;
    const prev = JSON.parse(localStorage.getItem(key) || "[]");
    const newResource = {
      id: `resource-${Date.now()}`,
      title: resource.title,
      url: resource.url,
      type: resource.resource_type || "other",
      description: resource.description,
      addedAt: new Date(),
    };
    localStorage.setItem(key, JSON.stringify([...prev, newResource]));
  };

  const getResourceIcon = (type: string) => {
    switch ((type || "").toLowerCase()) {
      case "video": return <Video className="h-8 w-8" />;
      case "course": return <BookOpen className="h-8 w-8" />;
      case "documentation": return <FileText className="h-8 w-8" />;
      case "practice": return <Code className="h-8 w-8" />;
      default: return <Globe className="h-8 w-8" />;
    }
  };

  // Filter resources by selected types
  const filteredResources = selectedTypes.length === 0
    ? resources
    : resources.filter(r => selectedTypes.includes((r.resource_type || '').toLowerCase()));

  return (
    <Card className="p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-semibold">Recommended Resources</h3>
          <p className="text-muted-foreground">Curated educational resources for {course.name}</p>
        </div>
        <Button onClick={() => fetchResources(true)} disabled={loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Finding new resources..." : "Refresh"}
        </Button>
      </div>
      <div className="border rounded-lg p-4 mb-6">
        <label className="text-sm font-medium mb-3 block">Filter by Resource Type</label>
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          {resourceTypes
            .filter((type): type is string => typeof type === "string")
            .map((type) => (
            <div key={type} className="flex items-center space-x-2">
              <Checkbox
                id={`filter-${type}`}
                checked={selectedTypes.includes(type.toLowerCase())}
                onCheckedChange={() => handleTypeToggle(type.toLowerCase())}
              />
              <label
                htmlFor={`filter-${type}`}
                className="text-sm font-medium leading-none"
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </label>
            </div>
          ))}
        </div>
      </div>
      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded mb-4 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin mb-4" />
          <p className="text-muted-foreground">Finding the best resources for {course.name}...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {filteredResources.length === 0 ? (
            <div className="col-span-full text-center text-muted-foreground py-8">
              No resources found for {course.name}. Try adjusting your filters or refresh to get new results.
            </div>
          ) : (
            filteredResources.map((resource, idx) => (
              <Card key={resource.url + idx} className="hover:shadow-lg transition-all duration-200 hover:scale-[1.02]">
                <div className="p-4 flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2 text-primary">
                    {getResourceIcon(resource.resource_type || "other")}
                  </div>
                  <Badge className="mb-2" variant="secondary">
                    {(resource.resource_type || "Resource").charAt(0).toUpperCase() + (resource.resource_type || "Resource").slice(1)}
                  </Badge>
                  <h5 className="font-semibold text-sm leading-tight mb-2 text-center line-clamp-2" title={resource.title || "Untitled Resource"}>
                    {resource.title || "Untitled Resource"}
                  </h5>
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2 text-center">
                    {resource.description || "No description available"}
                  </p>
                  <div className="flex flex-col items-center gap-1 mb-3">
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`h-3 w-3 ${i < Math.round(((resource.credibility_score + resource.relevance_score) / 2) * 5) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {(((resource.credibility_score + resource.relevance_score) / 2) * 5).toFixed(1)}/5
                    </span>
                  </div>
                  <div className="space-y-2 mb-3 w-full">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-green-700 font-medium">Credibility</span>
                        <span className="text-green-700">{Math.round((resource.credibility_score || 0) * 100)}%</span>
                      </div>
                      <Progress value={(resource.credibility_score || 0) * 100} className="h-1.5" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-blue-700 font-medium">Relevance</span>
                        <span className="text-blue-700">{Math.round((resource.relevance_score || 0) * 100)}%</span>
                      </div>
                      <Progress value={(resource.relevance_score || 0) * 100} className="h-1.5" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 w-full">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(resource.url, "_blank")}
                      className="w-full"
                      disabled={!resource.url}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Visit
                    </Button>
                    <Button size="sm" onClick={() => handleAddResource(resource)} className="w-full">
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </Card>
  );
} 