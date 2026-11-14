#!/usr/bin/env tsx
/**
 * Seed database with sample data
 * Usage: npm run db:seed
 */

import { getDb, saveDb } from './connection.js'
import { randomUUID } from 'crypto'

async function seed() {
  const db = await getDb()
  console.log('[db:seed] Seeding sample data...')

  const now = new Date().toISOString()

  // Sample users
  const users = [
    { id: randomUUID(), email: 'admin@spaceapps.local', name: 'Admin User', role: 'admin' as const, avatar_url: null },
    { id: randomUUID(), email: 'judge1@spaceapps.local', name: 'Dr. Sarah Chen', role: 'judge' as const, avatar_url: null },
    { id: randomUUID(), email: 'judge2@spaceapps.local', name: 'Prof. Marcus Webb', role: 'judge' as const, avatar_url: null },
    { id: randomUUID(), email: 'team-alpha@spaceapps.local', name: 'Team Alpha Lead', role: 'team' as const, avatar_url: null },
    { id: randomUUID(), email: 'team-beta@spaceapps.local', name: 'Team Beta Lead', role: 'team' as const, avatar_url: null },
  ]

  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (id, email, name, role, avatar_url, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  for (const u of users) {
    insertUser.run([u.id, u.email, u.name, u.role, u.avatar_url, now, now])
  }
  insertUser.free()
  console.log(`[db:seed] ✅ ${users.length} users`)

  // Sample teams
  const teams = [
    { id: randomUUID(), name: 'Team Alpha', description: 'Earth observation enthusiasts', created_by: users[3].id },
    { id: randomUUID(), name: 'Team Beta', description: 'Mars habitat designers', created_by: users[4].id },
  ]

  const insertTeam = db.prepare(`
    INSERT OR IGNORE INTO teams (id, name, description, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  for (const t of teams) {
    insertTeam.run([t.id, t.name, t.description ?? null, t.created_by, now, now])
  }
  insertTeam.free()
  console.log(`[db:seed] ✅ ${teams.length} teams`)

  // Team members
  const insertMember = db.prepare(`
    INSERT OR IGNORE INTO team_members (team_id, user_id, role, joined_at)
    VALUES (?, ?, ?, ?)
  `)
  insertMember.run([teams[0].id, users[3].id, 'lead', now])
  insertMember.run([teams[1].id, users[4].id, 'lead', now])
  insertMember.free()
  console.log('[db:seed] ✅ Team members')

  // Sample projects - use null for optional fields
  const projects = [
    {
      id: randomUUID(),
      team_id: teams[0].id,
      title: 'FireWatch: Real-time Wildfire Detection',
      description: 'ML-powered satellite imagery analysis for early fire detection',
      github_url: 'https://github.com/team-alpha/firewatch',
      demo_url: 'https://firewatch.demo',
      video_url: null,
      status: 'submitted' as const,
      submitted_at: now
    },
    {
      id: randomUUID(),
      team_id: teams[1].id,
      title: 'MarsBase: 3D-Printed Habitat Designer',
      description: 'Parametric habitat generator using ISRU materials',
      github_url: 'https://github.com/team-beta/marsbase',
      demo_url: null,
      video_url: null,
      status: 'draft' as const,
      submitted_at: null
    },
  ]

  const insertProject = db.prepare(`
    INSERT OR IGNORE INTO projects (id, team_id, title, description, github_url, demo_url, video_url, status, submitted_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  for (const p of projects) {
    insertProject.run([p.id, p.team_id, p.title, p.description ?? null, p.github_url ?? null, p.demo_url ?? null, p.video_url ?? null, p.status, p.submitted_at ?? null, now, now])
  }
  insertProject.free()
  console.log(`[db:seed] ✅ ${projects.length} projects`)

  // Judging criteria
  const criteria = [
    { id: randomUUID(), name: 'Innovation', description: 'Novelty and creativity of approach', weight: 1.5, max_score: 10 },
    { id: randomUUID(), name: 'Impact', description: 'Potential real-world impact', weight: 1.5, max_score: 10 },
    { id: randomUUID(), name: 'Technical Excellence', description: 'Code quality, architecture, execution', weight: 1.0, max_score: 10 },
    { id: randomUUID(), name: 'Presentation', description: 'Clarity, storytelling, demo quality', weight: 1.0, max_score: 10 },
  ]

  const insertCriterion = db.prepare(`
    INSERT OR IGNORE INTO criteria (id, name, description, weight, max_score, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  for (const c of criteria) {
    insertCriterion.run([c.id, c.name, c.description ?? null, c.weight, c.max_score, now])
  }
  insertCriterion.free()
  console.log(`[db:seed] ✅ ${criteria.length} criteria`)

  // Sample scores
  const insertScore = db.prepare(`
    INSERT OR IGNORE INTO scores (id, project_id, judge_id, criterion_id, score, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)

  // Judge 1 scores Team Alpha
  insertScore.run([randomUUID(), projects[0].id, users[1].id, criteria[0].id, 9, 'Excellent ML approach', now, now])
  insertScore.run([randomUUID(), projects[0].id, users[1].id, criteria[1].id, 10, 'High impact for disaster response', now, now])
  insertScore.run([randomUUID(), projects[0].id, users[1].id, criteria[2].id, 8, 'Solid implementation', now, now])
  insertScore.run([randomUUID(), projects[0].id, users[1].id, criteria[3].id, 9, 'Great demo', now, now])

  // Judge 2 scores Team Alpha
  insertScore.run([randomUUID(), projects[0].id, users[2].id, criteria[0].id, 8, 'Good innovation', now, now])
  insertScore.run([randomUUID(), projects[0].id, users[2].id, criteria[1].id, 9, 'Clear impact', now, now])
  insertScore.run([randomUUID(), projects[0].id, users[2].id, criteria[2].id, 7, 'Some technical debt', now, now])
  insertScore.run([randomUUID(), projects[0].id, users[2].id, criteria[3].id, 8, 'Well presented', now, now])

  insertScore.free()
  console.log('[db:seed] ✅ Sample scores')

  // Sample comments
  const insertComment = db.prepare(`
    INSERT OR IGNORE INTO comments (id, project_id, user_id, content, is_public, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  insertComment.run([randomUUID(), projects[0].id, users[1].id, 'Impressive use of satellite data. Consider edge cases for cloud cover.', 0, now, now])
  insertComment.run([randomUUID(), projects[0].id, users[2].id, 'Great potential for real-world deployment.', 1, now, now])
  insertComment.run([randomUUID(), projects[0].id, users[3].id, 'Thanks for the feedback! We\'re working on cloud penetration.', 1, now, now])

  insertComment.free()
  console.log('[db:seed] ✅ Sample comments')

  saveDb()
  console.log('[db:seed] Done!')
}

seed()