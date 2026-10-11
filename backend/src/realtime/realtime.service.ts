import { Global, Injectable, Module } from '@nestjs/common'
import { Subject } from 'rxjs'

export type ChangeKind = 'state' | 'registration'

export interface ChangeEvent {
  tournamentId: string
  kind: ChangeKind
  payload?: Record<string, unknown>
}

/**
 * Decouples services from the socket gateway: services announce that a tournament
 * changed, the gateway decides who to tell and what snapshot to send.
 */
@Injectable()
export class RealtimeService {
  readonly changes$ = new Subject<ChangeEvent>()

  stateChanged(tournamentId: string) {
    this.changes$.next({ tournamentId, kind: 'state' })
  }

  playerRegistered(tournamentId: string, payload: { id: string; name: string; role: string }) {
    this.changes$.next({ tournamentId, kind: 'registration', payload })
  }
}

@Global()
@Module({ providers: [RealtimeService], exports: [RealtimeService] })
export class RealtimeModule {}
