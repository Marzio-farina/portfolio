import { Injectable, signal } from '@angular/core';

export interface OptimisticTechnology {
  id: number;
  title: string;
  description?: string | null;
  isOptimistic: true;
  tempId: string;
  isRemoving?: boolean;
  projectId: number; // ID del progetto a cui appartiene
}

interface PendingApiCall {
  tempId: string;
  projectId: number;
  techName: string;
  timestamp: number;
}

/**
 * Service globale per gestire le tecnologie ottimistiche
 * Persiste lo stato tra le navigazioni
 */
@Injectable({
  providedIn: 'root'
})
export class OptimisticTechnologyService {
  // Mappa delle tecnologie ottimistiche per progetto
  // Key: projectId, Value: array di tecnologie ottimistiche
  private optimisticByProject = signal<Map<number, OptimisticTechnology[]>>(new Map());
  
  // Chiamate API in pending (per evitare duplicati se navighi via e torni)
  private pendingCalls = signal<PendingApiCall[]>([]);

  /**
   * Ottiene le tecnologie ottimistiche per un progetto specifico
   */
  getTechnologiesForProject(projectId: number): OptimisticTechnology[] {
    const map = this.optimisticByProject();
    return map.get(projectId) || [];
  }

  /**
   * Aggiunge una tecnologia ottimistica per un progetto
   */
  addOptimisticTechnology(projectId: number, tech: OptimisticTechnology): void {
    this.optimisticByProject.update(map => {
      const newMap = new Map(map);
      const current = newMap.get(projectId) || [];
      newMap.set(projectId, [...current, tech]);
      return newMap;
    });
    
    // Registra chiamata in pending
    this.pendingCalls.update(calls => [
      ...calls,
      {
        tempId: tech.tempId,
        projectId,
        techName: tech.title,
        timestamp: Date.now()
      }
    ]);
  }

  /**
   * Rimuove una tecnologia ottimistica (quando l'API completa)
   */
  removeOptimisticTechnology(projectId: number, tempId: string): void {
    this.optimisticByProject.update(map => {
      const newMap = new Map(map);
      const current = newMap.get(projectId) || [];
      newMap.set(projectId, current.filter(t => t.tempId !== tempId));
      return newMap;
    });
    
    // Rimuovi dalla lista pending
    this.pendingCalls.update(calls => 
      calls.filter(c => c.tempId !== tempId)
    );
  }

  /**
   * Marca una tecnologia ottimistica come in fase di rimozione
   */
  markAsRemoving(projectId: number, tempId: string): void {
    this.optimisticByProject.update(map => {
      const newMap = new Map(map);
      const current = newMap.get(projectId) || [];
      newMap.set(projectId, current.map(t => 
        t.tempId === tempId ? { ...t, isRemoving: true } : t
      ));
      return newMap;
    });
  }

  /**
   * Verifica se una tecnologia con questo nome è già in attesa per un progetto
   */
  isPending(projectId: number, techName: string): boolean {
    const techs = this.getTechnologiesForProject(projectId);
    return techs.some(t => t.title.toLowerCase() === techName.toLowerCase());
  }

  /**
   * Pulisce le tecnologie ottimistiche vecchie (più di 5 minuti)
   */
  cleanupOldTechnologies(): void {
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    
    this.pendingCalls.update(calls => {
      const expired = calls.filter(c => c.timestamp < fiveMinutesAgo);
      
      // Rimuovi le tecnologie ottimistiche corrispondenti
      expired.forEach(call => {
        this.removeOptimisticTechnology(call.projectId, call.tempId);
      });
      
      return calls.filter(c => c.timestamp >= fiveMinutesAgo);
    });
  }

  /**
   * Pulisce tutte le tecnologie ottimistiche per un progetto
   */
  clearProjectTechnologies(projectId: number): void {
    this.optimisticByProject.update(map => {
      const newMap = new Map(map);
      newMap.delete(projectId);
      return newMap;
    });
    
    this.pendingCalls.update(calls => 
      calls.filter(c => c.projectId !== projectId)
    );
  }
}

