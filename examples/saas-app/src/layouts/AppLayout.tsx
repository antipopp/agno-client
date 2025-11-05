import { Link, Outlet } from 'react-router-dom'
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList } from '@/components/ui/navigation-menu'
import { AICopilot } from '@/components/chat/AICopilot'

export function AppLayout() {
  return (
    <div className="flex flex-col h-screen">
      {/* Top Navigation */}
      <header className="border-b bg-background px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-semibold">SaaS Dashboard</h1>
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuLink asChild className="px-4 py-2 hover:bg-accent rounded-md">
                    <Link to="/">
                      Dashboard
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuLink asChild className="px-4 py-2 hover:bg-accent rounded-md">
                    <Link to="/reports">
                      Reports
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>
        </div>
      </header>

      {/* Main Content with Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main Content Area */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>

        {/* AI Copilot Sidebar */}
        <aside className="w-96 border-l bg-background">
          <AICopilot />
        </aside>
      </div>
    </div>
  )
}
