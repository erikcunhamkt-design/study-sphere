import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

export function MarketingHeader() {
  const { user } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-2xl bg-magenta flex items-center justify-center font-black italic text-white text-sm group-hover:scale-110 transition-transform">D</div>
          <span className="font-black tracking-tighter italic text-xl group-hover:text-magenta transition-colors">DOMINUSAPP</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          <Link to="/" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-magenta transition-colors">Início</Link>
          <a href="#funcionalidades" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-magenta transition-colors">Funcionalidades</a>
          <a href="#metodo" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-magenta transition-colors">Método</a>
          
          <div className="flex items-center gap-4 ml-4">
            {user ? (
              <Button asChild className="h-10 px-6 rounded-full bg-magenta hover:bg-magenta/90 text-white font-black text-[10px] uppercase tracking-widest">
                <Link to="/app">MEU COCKPIT</Link>
              </Button>
            ) : (
              <>
                <Link to="/login" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-white transition-colors">Entrar</Link>
                <Button asChild className="h-10 px-6 rounded-full bg-magenta hover:bg-magenta/90 text-white font-black text-[10px] uppercase tracking-widest">
                  <Link to="/cadastro">COMEÇAR GRÁTIS</Link>
                </Button>
              </>
            )}
          </div>
        </nav>

        {/* Mobile Toggle */}
        <button 
          className="md:hidden text-muted-foreground hover:text-white transition-colors"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Nav */}
      <div className={cn(
        "md:hidden absolute top-20 left-0 right-0 bg-[#0A0A0A] border-b border-white/5 px-6 py-8 flex flex-col gap-6 transition-all duration-300 origin-top",
        isMenuOpen ? "scale-y-100 opacity-100" : "scale-y-0 opacity-0 pointer-events-none"
      )}>
        <Link to="/" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground" onClick={() => setIsMenuOpen(false)}>Início</Link>
        <a href="#funcionalidades" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground" onClick={() => setIsMenuOpen(false)}>Funcionalidades</a>
        <a href="#metodo" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground" onClick={() => setIsMenuOpen(false)}>Método</a>
        <hr className="border-white/5" />
        {user ? (
          <Button asChild className="h-12 w-full rounded-full bg-magenta text-white font-black text-[10px] uppercase tracking-widest">
            <Link to="/app" onClick={() => setIsMenuOpen(false)}>MEU COCKPIT</Link>
          </Button>
        ) : (
          <div className="flex flex-col gap-4">
            <Link to="/login" className="text-[10px] font-black uppercase tracking-widest text-center py-2" onClick={() => setIsMenuOpen(false)}>Entrar</Link>
            <Button asChild className="h-12 w-full rounded-full bg-magenta text-white font-black text-[10px] uppercase tracking-widest">
              <Link to="/cadastro" onClick={() => setIsMenuOpen(false)}>COMEÇAR GRÁTIS</Link>
            </Button>
          </div>
        )}
      </div>
    </header>
  )
}
