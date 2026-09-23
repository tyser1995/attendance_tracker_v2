import { CourseForm } from '@/components/courses/CourseForm'
import { createCourse } from '../actions'

export default function NewCoursePage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900">Add Course</h1>
      <CourseForm action={createCourse} submitLabel="Add Course" />
    </div>
  )
}
