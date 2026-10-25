import AppHeader from '~/components/AppHeader'

type PageStubProps = {
  mainClassName: string
}

export default function PageStub({ mainClassName }: PageStubProps) {
  return (
    <div className="min-h-screen flex flex-col bg-app text-body">
      <AppHeader />
      <main
        id="main"
        tabIndex={-1}
        className={mainClassName}
      />
    </div>
  )
}
