import { describe, it, expect, beforeEach } from 'vitest'
import {
  createParticipant,
  updateParticipantStatus,
  setAsHost,
  removeHostStatus,
  ParticipantManager,
} from './participant'
import type { ProviderConfig } from '../types'

const mockProvider: ProviderConfig = {
  id: 'test-provider',
  name: 'Test Provider',
  baseURL: 'https://api.test.com',
  apiKey: 'test-key',
  modelId: 'test-model',
}

describe('createParticipant', () => {
  it('should create a participant with default options', () => {
    const participant = createParticipant(mockProvider)

    expect(participant.id).toBeDefined()
    expect(participant.name).toBe('Test Provider')
    expect(participant.provider).toBe(mockProvider)
    expect(participant.isHost).toBe(false)
    expect(participant.status).toBe('idle')
  })

  it('should create a participant with custom options', () => {
    const participant = createParticipant(mockProvider, {
      isHost: true,
      name: 'Custom Name',
    })

    expect(participant.name).toBe('Custom Name')
    expect(participant.isHost).toBe(true)
  })
})

describe('updateParticipantStatus', () => {
  it('should update participant status', () => {
    const participant = createParticipant(mockProvider)
    const updated = updateParticipantStatus(participant, 'thinking')

    expect(updated.status).toBe('thinking')
    expect(updated.id).toBe(participant.id)
  })
})

describe('setAsHost', () => {
  it('should set participant as host', () => {
    const participant = createParticipant(mockProvider)
    const updated = setAsHost(participant)

    expect(updated.isHost).toBe(true)
  })
})

describe('removeHostStatus', () => {
  it('should remove host status from participant', () => {
    const participant = createParticipant(mockProvider, { isHost: true })
    const updated = removeHostStatus(participant)

    expect(updated.isHost).toBe(false)
  })
})

describe('ParticipantManager', () => {
  let manager: ParticipantManager

  beforeEach(() => {
    manager = new ParticipantManager()
  })

  describe('add', () => {
    it('should add a participant', () => {
      const participant = manager.add(mockProvider)

      expect(participant.id).toBeDefined()
      expect(manager.count).toBe(1)
      expect(manager.get(participant.id)).toBe(participant)
    })

    it('should add a participant as host', () => {
      const participant = manager.add(mockProvider, { isHost: true })

      expect(participant.isHost).toBe(true)
      expect(manager.hasHost).toBe(true)
      expect(manager.getHost()).toStrictEqual(participant)
    })

    it('should add multiple participants', () => {
      const p1 = manager.add(mockProvider)
      const p2 = manager.add({ ...mockProvider, id: 'test-2' })

      expect(manager.count).toBe(2)
      expect(manager.getAll()).toContain(p1)
      expect(manager.getAll()).toContain(p2)
    })
  })

  describe('remove', () => {
    it('should remove a participant', () => {
      const participant = manager.add(mockProvider)
      const result = manager.remove(participant.id)

      expect(result).toBe(true)
      expect(manager.count).toBe(0)
    })

    it('should remove host and clear hostId', () => {
      const participant = manager.add(mockProvider, { isHost: true })
      manager.remove(participant.id)

      expect(manager.hasHost).toBe(false)
      expect(manager.getHost()).toBeNull()
    })

    it('should return false for non-existent participant', () => {
      const result = manager.remove('non-existent')
      expect(result).toBe(false)
    })
  })

  describe('setHost', () => {
    it('should set a participant as host', () => {
      const participant = manager.add(mockProvider)
      const result = manager.setHost(participant.id)

      expect(result).toBe(true)
      expect(manager.getHost()?.id).toBe(participant.id)
    })

    it('should replace existing host', () => {
      const p1 = manager.add(mockProvider, { isHost: true })
      const p2 = manager.add({ ...mockProvider, id: 'test-2' })

      manager.setHost(p2.id)

      expect(manager.getHost()?.id).toBe(p2.id)
      expect(manager.get(p1.id)?.isHost).toBe(false)
    })

    it('should return false for non-existent participant', () => {
      const result = manager.setHost('non-existent')
      expect(result).toBe(false)
    })
  })

  describe('updateStatus', () => {
    it('should update participant status', () => {
      const participant = manager.add(mockProvider)
      const result = manager.updateStatus(participant.id, 'thinking')

      expect(result).toBe(true)
      expect(manager.get(participant.id)?.status).toBe('thinking')
    })

    it('should return false for non-existent participant', () => {
      const result = manager.updateStatus('non-existent', 'thinking')
      expect(result).toBe(false)
    })
  })

  describe('getNonHost', () => {
    it('should return only non-host participants', () => {
      const host = manager.add(mockProvider, { isHost: true, name: 'Host' })
      const p1 = manager.add({ ...mockProvider, id: 'test-2' }, { name: 'P1' })
      const p2 = manager.add({ ...mockProvider, id: 'test-3' }, { name: 'P2' })

      const nonHosts = manager.getNonHost()

      expect(nonHosts).toHaveLength(2)
      expect(nonHosts.map(p => p.id)).toContain(p1.id)
      expect(nonHosts.map(p => p.id)).toContain(p2.id)
      expect(nonHosts.map(p => p.id)).not.toContain(host.id)
    })
  })

  describe('resetAllStatus', () => {
    it('should reset all participants to idle', () => {
      const p1 = manager.add(mockProvider)
      const p2 = manager.add({ ...mockProvider, id: 'test-2' })

      manager.updateStatus(p1.id, 'thinking')
      manager.updateStatus(p2.id, 'error')
      manager.resetAllStatus()

      expect(manager.get(p1.id)?.status).toBe('idle')
      expect(manager.get(p2.id)?.status).toBe('idle')
    })
  })

  describe('getParticipantNames', () => {
    it('should return all participant names', () => {
      manager.add(mockProvider, { name: 'Alice' })
      manager.add({ ...mockProvider, id: 'test-2' }, { name: 'Bob' })

      const names = manager.getParticipantNames()
      expect(names).toBe('Alice, Bob')
    })

    it('should exclude host when specified', () => {
      manager.add(mockProvider, { name: 'Host', isHost: true })
      manager.add({ ...mockProvider, id: 'test-2' }, { name: 'Participant' })

      const names = manager.getParticipantNames(true)
      expect(names).toBe('Participant')
    })
  })

  describe('clear', () => {
    it('should remove all participants', () => {
      manager.add(mockProvider)
      manager.add({ ...mockProvider, id: 'test-2' })
      manager.clear()

      expect(manager.count).toBe(0)
      expect(manager.hasHost).toBe(false)
    })
  })
})
