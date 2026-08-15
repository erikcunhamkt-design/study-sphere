import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { Menu, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { AppBrand } from '@/components/layout/app-brand'

export function MarketingHeader() {
  const { user } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  const showAuthLinks = isHydrated && user;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group transition-transform hover:scale-[1.02]">
          <AppBrand />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          <Link to="/" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 hover:text-primary transition-colors">Início</Link>
          <a href="#como-funciona" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 hover:text-primary transition-colors">Como funciona</a>
          <a href="#metodo" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 hover:text-primary transition-colors">Aprendizagem</a>
          
          <div className="flex items-center gap-4 ml-4">
            {showAuthLinks ? (
              <Button asChild className="h-10 px-6 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/10">
                <Link to="/app">MEU COCKPIT</Link>
              </Button>
            ) : (
              <>
                <Link to="/login" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 hover:text-foreground transition-colors">Entrar</Link>
                <Button asChild className="h-10 px-6 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/10">
                  <Link to="/cadastro">Começar gratuitamente</Link>
                </Button>
              </>
            )}
          </div>
        </nav>

        {/* Mobile Toggle */}
        <button 
          className="md:hidden text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Nav */}
      <div className={cn(
        "md:hidden absolute top-20 left-0 right-0 bg-background border-b border-border/40 px-6 py-8 flex flex-col gap-6 transition-all duration-300 origin-top",
        isMenuOpen ? "scale-y-100 opacity-100" : "scale-y-0 opacity-0 pointer-events-none"
      )}>
        <Link to="/" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground" onClick={() => setIsMenuOpen(false)}>Início</Link>
        <a href="#como-funciona" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground" onClick={() => setIsMenuOpen(false)}>Como funciona</a>
        <a href="#metodo" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground" onClick={() => setIsMenuOpen(false)}>Aprendizagem</a>
        <hr className="border-border/40" />
        {showAuthLinks ? (
          <Button asChild className="h-12 w-full rounded-full bg-primary text-primary-foreground font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/10">
            <Link to="/app" onClick={() => setIsMenuOpen(false)}>MEU COCKPIT</Link>
          </Button>
        ) : (
          <div className="flex flex-col gap-4">
            <Link to="/login" className="text-[10px] font-black uppercase tracking-widest text-center py-2" onClick={() => setIsMenuOpen(false)}>Entrar</Link>
            <Button asChild className="h-12 w-full rounded-full bg-primary text-primary-foreground font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/10">
              <Link to="/cadastro" onClick={() => setIsMenuOpen(false)}>Começar gratuitamente</Link>
            </Button>
          </div>
        )}
      </div>
    </header>
  )
}
