import Link from "next/link"
import { Button } from "@/components/ui/button"
import { GraduationCap } from "lucide-react"
import { ColorSchemeInitializer } from "./color-scheme-initializer"

export default function Home() {
  // In a real app, we would check if the user is authenticated here
  // and redirect them to the dashboard if they are

  return (
    <>
      <ColorSchemeInitializer />
      <div className="flex min-h-screen flex-col">
        <header className="border-b bg-white px-6 py-4">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-6 w-6" />
              <span className="text-xl font-bold">CourseHelper</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login">
                <Button variant="outline">Log in</Button>
              </Link>
              <Link href="/signup">
                <Button>Sign up</Button>
              </Link>
            </div>
          </div>
        </header>
        <main className="flex-1">
          <section className="bg-gradient-to-b from-white to-gray-50 px-6 py-24">
            <div className="mx-auto max-w-4xl text-center">
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
                Manage your college coursework with ease
              </h1>
              <p className="mt-6 text-lg text-gray-600">
                Stay organized, get personalized course recommendations, and excel in your academic journey.
              </p>
              <div className="mt-10 flex justify-center gap-4">
                <Link href="/signup">
                  <Button size="lg">Get Started</Button>
                </Link>
                <Link href="#features">
                  <Button size="lg" variant="outline">
                    Learn More
                  </Button>
                </Link>
              </div>
            </div>
          </section>
          <section id="features" className="px-6 py-24">
            <div className="mx-auto max-w-7xl">
              <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
                Features designed for students
              </h2>
              <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-lg border p-6">
                  <h3 className="text-xl font-semibold">Course Management</h3>
                  <p className="mt-2 text-gray-600">Easily add, organize, and track your courses in one place.</p>
                </div>
                <div className="rounded-lg border p-6">
                  <h3 className="text-xl font-semibold">Personalized Recommendations</h3>
                  <p className="mt-2 text-gray-600">
                    Get course suggestions based on your major and academic interests.
                  </p>
                </div>
                <div className="rounded-lg border p-6">
                  <h3 className="text-xl font-semibold">Progress Tracking</h3>
                  <p className="mt-2 text-gray-600">Monitor your academic progress and stay on track to graduate.</p>
                </div>
              </div>
            </div>
          </section>
        </main>
        <footer className="border-t bg-white px-6 py-8">
          <div className="mx-auto max-w-7xl text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} CourseHelper. All rights reserved.
          </div>
        </footer>
      </div>
    </>
  )
}
