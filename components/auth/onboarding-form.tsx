"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"

export function OnboardingForm() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    fullName: "",
    college: "",
    year: "",
    major: "",
  })

  // Add this useEffect hook
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('token');

    if (tokenFromUrl) {
      localStorage.setItem('token', tokenFromUrl);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found. Please log in again.");
      }
        console.log("Token retrieved from localStorage:", token);  // Add this for debugging

      const response = await fetch(`${process.env.BACKEND_URL}/api/users/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          fullName: formData.fullName,  // Changed from first_name/last_name to fullName
          college: formData.college,
          year: formData.year,
          major: formData.major
        }),
      });

      const data = await response.json();
      console.log("Response data:", data);  // Add this for debugging
      console.log("Sending request with token:", token ? "Token exists" : "No token");
      console.log("Request headers:", {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      });
      console.log(token);

      if (!response.ok) {
        throw new Error(data.error || data.message || "Failed to update profile");
      }

      toast({
        title: "Success",
        description: "Profile updated successfully!",
      });
      router.push("/courses");
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name</Label>
          <Input
            id="fullName"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            placeholder="Enter your full name"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="college">College/University</Label>
          <Input
            id="college"
            name="college"
            value={formData.college}
            onChange={handleChange}
            placeholder="Enter your college or university"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="year">Year in College</Label>
          <Select value={formData.year} onValueChange={(value) => handleSelectChange("year", value)}>
            <SelectTrigger id="year">
              <SelectValue placeholder="Select your year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="freshman">Freshman</SelectItem>
              <SelectItem value="sophomore">Sophomore</SelectItem>
              <SelectItem value="junior">Junior</SelectItem>
              <SelectItem value="senior">Senior</SelectItem>
              <SelectItem value="graduate">Graduate</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="major">Major</Label>
          <Input
            id="major"
            name="major"
            value={formData.major}
            onChange={handleChange}
            placeholder="Enter your major"
            required
          />
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Saving..." : "Continue"}
        </Button>
      </form>
    </Card>
  )
}
