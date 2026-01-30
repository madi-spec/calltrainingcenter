/**
 * Scenario Bookmarks API Routes
 *
 * Handles bookmarking/favoriting scenarios for quick access
 */

import { Router } from 'express';
import { authMiddleware, tenantMiddleware } from '../lib/auth.js';
import { createAdminClient, TABLES } from '../lib/supabase.js';

const router = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

/**
 * GET /api/bookmarks
 * Get all bookmarked scenarios for the user
 */
router.get('/', async (req, res) => {
  try {
    const { folder, favorites_only } = req.query;
    const adminClient = createAdminClient();

    let query = adminClient
      .from(TABLES.SCENARIO_BOOKMARKS)
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (folder) {
      query = query.eq('folder', folder);
    }

    if (favorites_only === 'true') {
      query = query.eq('is_favorite', true);
    }

    const { data: bookmarks, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      bookmarks: bookmarks || []
    });
  } catch (error) {
    console.error('Error fetching bookmarks:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/bookmarks/check/:scenarioId
 * Check if a scenario is bookmarked
 */
router.get('/check/:scenarioId', async (req, res) => {
  try {
    const { scenarioId } = req.params;
    const adminClient = createAdminClient();

    const { data: bookmark } = await adminClient
      .from(TABLES.SCENARIO_BOOKMARKS)
      .select('id, is_favorite, notes, folder')
      .eq('user_id', req.user.id)
      .eq('scenario_id', scenarioId)
      .single();

    res.json({
      success: true,
      isBookmarked: !!bookmark,
      bookmark: bookmark || null
    });
  } catch (error) {
    console.error('Error checking bookmark:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/bookmarks
 * Create a new bookmark
 */
router.post('/', async (req, res) => {
  try {
    const { scenario_id, notes, tags, folder, is_favorite } = req.body;

    if (!scenario_id) {
      return res.status(400).json({ error: 'scenario_id is required' });
    }

    const adminClient = createAdminClient();

    const { data: bookmark, error } = await adminClient
      .from(TABLES.SCENARIO_BOOKMARKS)
      .insert({
        user_id: req.user.id,
        organization_id: req.organization.id,
        scenario_id,
        notes: notes || null,
        tags: tags || [],
        folder: folder || 'default',
        is_favorite: is_favorite || false
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        // Already bookmarked - return existing
        const { data: existing } = await adminClient
          .from(TABLES.SCENARIO_BOOKMARKS)
          .select('*')
          .eq('user_id', req.user.id)
          .eq('scenario_id', scenario_id)
          .single();

        return res.json({
          success: true,
          bookmark: existing,
          already_existed: true
        });
      }
      throw error;
    }

    res.json({
      success: true,
      bookmark
    });
  } catch (error) {
    console.error('Error creating bookmark:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/bookmarks/:scenarioId
 * Update a bookmark
 */
router.patch('/:scenarioId', async (req, res) => {
  try {
    const { scenarioId } = req.params;
    const { notes, tags, folder, is_favorite } = req.body;

    const adminClient = createAdminClient();

    const updates = { updated_at: new Date().toISOString() };
    if (notes !== undefined) updates.notes = notes;
    if (tags !== undefined) updates.tags = tags;
    if (folder !== undefined) updates.folder = folder;
    if (is_favorite !== undefined) updates.is_favorite = is_favorite;

    const { data: bookmark, error } = await adminClient
      .from(TABLES.SCENARIO_BOOKMARKS)
      .update(updates)
      .eq('user_id', req.user.id)
      .eq('scenario_id', scenarioId)
      .select()
      .single();

    if (error) throw error;

    if (!bookmark) {
      return res.status(404).json({ error: 'Bookmark not found' });
    }

    res.json({
      success: true,
      bookmark
    });
  } catch (error) {
    console.error('Error updating bookmark:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/bookmarks/:scenarioId
 * Remove a bookmark
 */
router.delete('/:scenarioId', async (req, res) => {
  try {
    const { scenarioId } = req.params;
    const adminClient = createAdminClient();

    const { error } = await adminClient
      .from(TABLES.SCENARIO_BOOKMARKS)
      .delete()
      .eq('user_id', req.user.id)
      .eq('scenario_id', scenarioId);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting bookmark:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/bookmarks/:scenarioId/toggle
 * Toggle bookmark status for a scenario
 */
router.post('/:scenarioId/toggle', async (req, res) => {
  try {
    const { scenarioId } = req.params;
    const adminClient = createAdminClient();

    // Check if already bookmarked
    const { data: existing } = await adminClient
      .from(TABLES.SCENARIO_BOOKMARKS)
      .select('id')
      .eq('user_id', req.user.id)
      .eq('scenario_id', scenarioId)
      .single();

    if (existing) {
      // Remove bookmark
      await adminClient
        .from(TABLES.SCENARIO_BOOKMARKS)
        .delete()
        .eq('id', existing.id);

      return res.json({
        success: true,
        isBookmarked: false
      });
    } else {
      // Add bookmark
      const { data: bookmark, error } = await adminClient
        .from(TABLES.SCENARIO_BOOKMARKS)
        .insert({
          user_id: req.user.id,
          organization_id: req.organization.id,
          scenario_id: scenarioId
        })
        .select()
        .single();

      if (error) throw error;

      return res.json({
        success: true,
        isBookmarked: true,
        bookmark
      });
    }
  } catch (error) {
    console.error('Error toggling bookmark:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/bookmarks/:scenarioId/toggle-favorite
 * Toggle favorite status for a bookmarked scenario
 */
router.post('/:scenarioId/toggle-favorite', async (req, res) => {
  try {
    const { scenarioId } = req.params;
    const adminClient = createAdminClient();

    // Get current bookmark
    const { data: bookmark } = await adminClient
      .from(TABLES.SCENARIO_BOOKMARKS)
      .select('id, is_favorite')
      .eq('user_id', req.user.id)
      .eq('scenario_id', scenarioId)
      .single();

    if (!bookmark) {
      // Create bookmark as favorite
      const { data: newBookmark, error } = await adminClient
        .from(TABLES.SCENARIO_BOOKMARKS)
        .insert({
          user_id: req.user.id,
          organization_id: req.organization.id,
          scenario_id: scenarioId,
          is_favorite: true
        })
        .select()
        .single();

      if (error) throw error;

      return res.json({
        success: true,
        isFavorite: true,
        bookmark: newBookmark
      });
    }

    // Toggle favorite
    const { data: updated, error } = await adminClient
      .from(TABLES.SCENARIO_BOOKMARKS)
      .update({
        is_favorite: !bookmark.is_favorite,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookmark.id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      isFavorite: updated.is_favorite,
      bookmark: updated
    });
  } catch (error) {
    console.error('Error toggling favorite:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/bookmarks/:scenarioId/practiced
 * Update bookmark with practice info after completing a session
 */
router.post('/:scenarioId/practiced', async (req, res) => {
  try {
    const { scenarioId } = req.params;
    const { score } = req.body;
    const adminClient = createAdminClient();

    // Get current bookmark
    const { data: bookmark } = await adminClient
      .from(TABLES.SCENARIO_BOOKMARKS)
      .select('id, practice_count, best_score')
      .eq('user_id', req.user.id)
      .eq('scenario_id', scenarioId)
      .single();

    if (!bookmark) {
      return res.json({ success: true, updated: false });
    }

    const newBestScore = score > (bookmark.best_score || 0) ? score : bookmark.best_score;

    const { data: updated, error } = await adminClient
      .from(TABLES.SCENARIO_BOOKMARKS)
      .update({
        last_practiced_at: new Date().toISOString(),
        practice_count: (bookmark.practice_count || 0) + 1,
        best_score: newBestScore,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookmark.id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      updated: true,
      bookmark: updated
    });
  } catch (error) {
    console.error('Error updating bookmark practice:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/bookmarks/folders
 * Get all bookmark folders for the user
 */
router.get('/folders', async (req, res) => {
  try {
    const adminClient = createAdminClient();

    const { data: folders, error } = await adminClient
      .from(TABLES.BOOKMARK_FOLDERS)
      .select('*')
      .eq('user_id', req.user.id)
      .order('display_order', { ascending: true });

    if (error) throw error;

    // Get count per folder
    const { data: bookmarks } = await adminClient
      .from(TABLES.SCENARIO_BOOKMARKS)
      .select('folder')
      .eq('user_id', req.user.id);

    const folderCounts = {};
    bookmarks?.forEach(b => {
      folderCounts[b.folder] = (folderCounts[b.folder] || 0) + 1;
    });

    const foldersWithCounts = (folders || []).map(f => ({
      ...f,
      count: folderCounts[f.name] || 0
    }));

    // Add default folder if not exists
    if (!foldersWithCounts.find(f => f.name === 'default')) {
      foldersWithCounts.unshift({
        id: 'default',
        name: 'default',
        icon: '📁',
        color: '#6B7280',
        count: folderCounts['default'] || 0
      });
    }

    res.json({
      success: true,
      folders: foldersWithCounts
    });
  } catch (error) {
    console.error('Error fetching folders:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/bookmarks/folders
 * Create a new folder
 */
router.post('/folders', async (req, res) => {
  try {
    const { name, icon, color } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Folder name is required' });
    }

    const adminClient = createAdminClient();

    const { data: folder, error } = await adminClient
      .from(TABLES.BOOKMARK_FOLDERS)
      .insert({
        user_id: req.user.id,
        name,
        icon: icon || '📁',
        color: color || '#6B7280'
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Folder already exists' });
      }
      throw error;
    }

    res.json({
      success: true,
      folder
    });
  } catch (error) {
    console.error('Error creating folder:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/bookmarks/folders/:name
 * Delete a folder (moves bookmarks to default)
 */
router.delete('/folders/:name', async (req, res) => {
  try {
    const { name } = req.params;

    if (name === 'default') {
      return res.status(400).json({ error: 'Cannot delete default folder' });
    }

    const adminClient = createAdminClient();

    // Move bookmarks to default folder
    await adminClient
      .from(TABLES.SCENARIO_BOOKMARKS)
      .update({ folder: 'default' })
      .eq('user_id', req.user.id)
      .eq('folder', name);

    // Delete folder
    await adminClient
      .from(TABLES.BOOKMARK_FOLDERS)
      .delete()
      .eq('user_id', req.user.id)
      .eq('name', name);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting folder:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
