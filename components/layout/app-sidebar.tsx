'use client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import api from '@/lib/api';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger
} from '@/components/ui/sidebar';
import { navItems, teacherNavItems } from '@/constants/data';
import {
  ChevronRight,
  ChevronsUpDown,
  GalleryVerticalEnd,
  LogOut
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { Breadcrumbs } from '../breadcrumbs';
import { Icons } from '../icons';
import ThemeToggle from './ThemeToggle/theme-toggle';

/** Стабильный оттенок 0–359 от строки (сид — имя пользователя) */
const hueFromSeed = (seed: string): number => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i);
  }
  return Math.abs(h) % 360;
};

const initialsFromName = (name: string): string => {
  const t = name.trim();
  if (!t) return '?';
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0]?.[0] ?? '';
    const b = parts[parts.length - 1]?.[0] ?? '';
    return (a + b).toUpperCase();
  }
  return t.slice(0, 2).toUpperCase();
};

export const company = {
  name: 'Acme Inc',
  logo: GalleryVerticalEnd,
  plan: 'Enterprise'
};

export default function AppSidebar({
  children
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<{
    company_name?: string;
    name: string;
    type?: string;
    id?: number;
    show_subject_groups_nav?: boolean;
  }>({
    company_name: "Freedom",
    name: "Berdyshev Kerey",
    type: "user"
  });

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    router.push('/signin');
  };

  useEffect(() => {
    async function fetchUserInfo() {
      try {
        const userInfo = await api.getCurrentUser();
        setUserInfo(userInfo);
      } catch (error) {
        console.error('Failed to fetch user information:', error);
      }
    }
  
    fetchUserInfo();
  }, []);

  const [mounted, setMounted] = React.useState(false);
  const pathname = usePathname();
  const isTeacherRoute = pathname?.startsWith('/dashboard/teacher');

  const isNavItemActive = (url: string) => {
    if (!pathname) return false
    if (pathname === url) return true
    if (url === '/dashboard/teacher') return false
    return pathname.startsWith(`${url}/`)
  }

  const sidebarNavItems = React.useMemo(() => {
    if (userInfo?.type === 'teacher') {
      return teacherNavItems;
    }
    return [...navItems, { title: 'Предметы', url: '/dashboard/subjects', icon: 'forms' as const }];
  }, [userInfo?.type]);
  // Only render after first client-side mount
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null; // or a loading skeleton
  }

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex gap-2 py-2 text-sidebar-accent-foreground ">
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg  text-sidebar-primary-foreground">
              <company.logo className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">Unified Student Profile</span>
              <span className="truncate text-xs">{userInfo.name}</span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent className="overflow-x-hidden">
          <SidebarGroup>
            <SidebarGroupLabel>Функционал</SidebarGroupLabel>
            <SidebarMenu>
              {sidebarNavItems
                .filter((item) => {
                  const navItem = item as { teacherOnly?: boolean; adminOnly?: boolean }
                  const userType = userInfo?.type || 'user'
                  if (userType === 'teacher') {
                    return true
                  }
                  if (userType === 'admin') {
                    if (navItem.teacherOnly) {
                      return false
                    }
                    return true
                  }
                  if (navItem.teacherOnly) {
                    return false
                  }
                  if (navItem.adminOnly) {
                    return false
                  }
                  if (item.url === '/admin/settings') {
                    return false
                  }
                  return true
                })
                .map((item) => {
                // Safe icon handling with type checking
                const iconKey = item.icon;
                const IconComponent = iconKey && typeof iconKey === 'string' && iconKey in Icons 
                  ? Icons[iconKey as keyof typeof Icons] 
                  : Icons.logo;
                
                return (item as any)?.items && (item as any)?.items?.length > 0 ? (
                  <Collapsible
                    key={item.title}
                    asChild
                    defaultOpen={true}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          tooltip={item.title}
                          isActive={isNavItemActive(item.url)}
                        >
                          {item.icon && <IconComponent />}
                          <span>{item.title}</span>
                          <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {(item as any).items?.map((subItem: {title: string; url: string}) => (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={isNavItemActive(subItem.url)}
                              >
                                <Link href={subItem.url}>
                                  <span>{subItem.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                ) : (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.title}
                      isActive={isNavItemActive(item.url)}
                    >
                      <Link href={item.url}>
                        <IconComponent />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  >
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarFallback
                        className="rounded-lg text-[11px] font-semibold text-white shadow-inner"
                        style={{
                          backgroundColor: `hsl(${hueFromSeed(userInfo.name)} 52% 44%)`,
                        }}
                        title={userInfo.name}
                      >
                        {initialsFromName(userInfo.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {userInfo.name}
                      </span>
                    </div>
                    <ChevronsUpDown className="ml-auto size-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                  side="bottom"
                  align="end"
                  sideOffset={4}
                >
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 size-4" />
                    Выйти
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            {!isTeacherRoute && (
              <>
                <Separator orientation="vertical" className="mr-2 h-4" />
                <Breadcrumbs />
              </>
            )}
          </div>
        </header>
        {/* page main content */}
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
