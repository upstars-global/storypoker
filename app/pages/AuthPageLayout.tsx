import type { ReactNode } from 'react'
import AppHeader from '~/components/AppHeader'

type AuthPageLayoutProps = {
  title: string
  description: string
  children: ReactNode
}

export default function AuthPageLayout({ title, description, children }: AuthPageLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-app text-body">
      <AppHeader />
      <main
        id="main"
        tabIndex={-1}
        className="flex flex-1 items-center justify-center px-4 py-10 outline-none"
      >
        <section className="mui-modal-paper max-w-md">
          <h1 className="mui-h5 text-center">
            {title}
          </h1>
          <p className="mui-caption text-center mt-2">
            {description}
          </p>
          {children}
        </section>
      </main>
    </div>
  )
}
