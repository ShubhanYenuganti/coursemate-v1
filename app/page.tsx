import Link from "next/link"
import { Button } from "@/components/ui/button"
import { GraduationCap, Calendar, MessageCircle, Users, Target, BookOpen, BarChart3, Clock, Sparkles, ArrowRight, CheckCircle, Star } from "lucide-react"
import { ColorSchemeInitializer } from "./color-scheme-initializer"

export default function Home() {
  return (
    <>
      <ColorSchemeInitializer />
      <div className="flex min-h-screen flex-col bg-white">
        {/* Header */}
        <header className="border-b border-gray-200 bg-white px-6 py-4 sticky top-0 z-50 shadow-sm">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-indigo-600">CourseMate</span>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50">Log in</Button>
              </Link>
              <Link href="/signup">
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg">
                  Sign up
                </Button>
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1">
          {/* Hero Section */}
          <section className="px-6 py-20 lg:py-32 bg-gray-50">
            <div className="mx-auto max-w-6xl text-center">
              <div className="mb-8 inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 px-4 py-2 rounded-full text-sm font-medium">
                <Sparkles className="h-4 w-4" />
                Your AI-powered study companion
              </div>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl mb-6 text-gray-900">
                Master your courses with{" "}
                <span className="text-indigo-600">
                  intelligent study planning
                </span>
              </h1>
              <p className="mt-6 text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                CourseMate combines AI-powered study scheduling, community collaboration, and progress tracking to help you excel in every course. From personalized study plans to real-time chat support.
              </p>
              <div className="mt-12 flex flex-col sm:flex-row justify-center gap-4">
                <Link href="/signup">
                  <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl px-8 py-4 text-lg font-semibold">
                    Start Learning for Free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="#features">
                  <Button size="lg" variant="outline" className="px-8 py-4 text-lg border-gray-300 text-gray-700 hover:bg-gray-50">
                    See How It Works
                  </Button>
                </Link>
              </div>

              {/* Social Proof */}
              <div className="mt-16 flex items-center justify-center gap-8 text-gray-500">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 bg-indigo-500 rounded-full border-2 border-white"></div>
                    <div className="w-8 h-8 bg-cyan-500 rounded-full border-2 border-white"></div>
                    <div className="w-8 h-8 bg-green-500 rounded-full border-2 border-white"></div>
                  </div>
                  <span className="text-sm font-medium">Join 1000+ students</span>
                </div>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  ))}
                  <span className="ml-2 text-sm font-medium">4.9/5 rating</span>
                </div>
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section id="features" className="px-6 py-20 bg-white">
            <div className="mx-auto max-w-7xl">
              <div className="text-center mb-16">
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl mb-6 text-gray-900">
                  Everything you need to succeed
                </h2>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                  CourseMate brings together powerful tools to transform how you learn, study, and collaborate with classmates.
                </p>
              </div>
              
              <div className="grid gap-8 lg:grid-cols-3 mb-16">
                <div className="group p-8 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Target className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-4 text-gray-900">AI Study Planning</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Get personalized study schedules, goal tracking, and intelligent task management tailored to your learning style and course requirements.
                  </p>
                </div>

                <div className="group p-8 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <div className="w-12 h-12 bg-cyan-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Calendar className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-4 text-gray-900">Smart Scheduling</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Automatically schedule study sessions, assignments, and deadlines with our intelligent calendar that adapts to your availability.
                  </p>
                </div>

                <div className="group p-8 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <MessageCircle className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-4 text-gray-900">AI Chat Assistant</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Get instant help with course concepts, homework problems, and study questions from our intelligent AI tutor available 24/7.
                  </p>
                </div>

                <div className="group p-8 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <div className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-4 text-gray-900">Study Communities</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Connect with classmates, join study groups, share resources, and collaborate on projects in dedicated course communities.
                  </p>
                </div>

                <div className="group p-8 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <div className="w-12 h-12 bg-pink-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <BarChart3 className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-4 text-gray-900">Progress Analytics</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Track your study streaks, completion rates, and academic progress with detailed insights and motivational analytics.
                  </p>
                </div>

                <div className="group p-8 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <BookOpen className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-4 text-gray-900">Resource Library</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Access a comprehensive library of study materials, course notes, and educational resources curated for your specific courses.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Benefits Section */}
          <section className="px-6 py-20 bg-gray-50">
            <div className="mx-auto max-w-6xl">
              <div className="grid lg:grid-cols-2 gap-16 items-center">
                <div className="text-center lg:text-left">
                  <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-8 text-gray-900">
                    Why students choose CourseMate
                  </h2>
                  <div className="space-y-6 max-w-lg mx-auto lg:mx-0">
                    <div className="flex items-start gap-4 text-left">
                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2 text-gray-900">Boost your GPA by 15% on average</h3>
                        <p className="text-gray-600">Students using CourseMate see significant improvements in their academic performance.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 text-left">
                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2 text-gray-900">Save 10+ hours per week</h3>
                        <p className="text-gray-600">Intelligent scheduling and planning tools help you study more efficiently.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 text-left">
                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2 text-gray-900">Never miss a deadline again</h3>
                        <p className="text-gray-600">Smart reminders and calendar integration keep you on track with all assignments.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 text-left">
                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2 text-gray-900">Get instant help anytime</h3>
                        <p className="text-gray-600">24/7 AI assistance plus active study communities for all your questions.</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-center items-center">
                  <div className="inline-block p-8 bg-indigo-600 rounded-3xl shadow-2xl">
                    <div className="bg-white rounded-2xl p-8 shadow-xl">
                      <div className="text-center">
                        <div className="text-4xl font-bold text-gray-900 mb-2">92%</div>
                        <div className="text-gray-600 mb-6">of students improve their grades</div>
                        <div className="text-3xl font-bold text-gray-900 mb-2">10hrs</div>
                        <div className="text-gray-600 mb-6">saved per week on average</div>
                        <div className="text-3xl font-bold text-gray-900 mb-2">24/7</div>
                        <div className="text-gray-600">AI assistance available</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="px-6 py-20 bg-indigo-600">
            <div className="mx-auto max-w-4xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl text-white mb-6">
                Ready to transform your academic journey?
              </h2>
              <p className="text-xl text-indigo-100 mb-12 max-w-2xl mx-auto">
                Join thousands of students who are already using CourseMate to achieve their academic goals. Start your free trial today.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link href="/signup">
                  <Button size="lg" className="bg-white text-indigo-600 hover:bg-gray-50 px-8 py-4 text-lg font-semibold shadow-xl">
                    Get Started Free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 px-8 py-4 text-lg">
                    Sign In
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t border-gray-200 bg-white px-6 py-12">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="flex items-center gap-3 mb-4 md:mb-0">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                  <GraduationCap className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold text-indigo-600">CourseMate</span>
              </div>
              <div className="text-center text-sm text-gray-500">
                &copy; {new Date().getFullYear()} CourseMate. All rights reserved. Empowering students worldwide.
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}
