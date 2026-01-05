import express from 'express';

const router = express.Router();

// Mock data pour développement
const mockCampaigns = [
  {
    id: '1',
    title: "Aide Jeunesse 2026",
    organization: "Conseil Départemental Essonne",
    description: "Soutien aux projets de jeunesse et mobilité durable",
    minAmount: 5000,
    maxAmount: 15000,
    deadline: new Date('2026-03-31'),
    status: "ACTIVE",
    category: "YOUTH",
    contactEmail: "contact@essonne.fr",
    contactPhone: "01 69 47 89 89",
    websiteUrl: "https://www.essonne.fr",
    notes: "Programme prioritaire 2026",
    createdBy: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    SubventionExpense: []
  }
];

/**
 * GET /api/subventions - Lister toutes les campagnes de subvention
 */
router.get('/', async (req, res) => {
  try {
    const { status, organization } = req.query;
    
    let campaigns = [...mockCampaigns];
    
    if (status) {
      campaigns = campaigns.filter(c => c.status === status);
    }
    if (organization) {
      campaigns = campaigns.filter(c => c.organization.toLowerCase().includes(organization.toLowerCase()));
    }

    res.json(campaigns);
  } catch (error) {
    console.error('Erreur GET /api/subventions:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

/**
 * GET /api/subventions/:id - Récupérer une campagne spécifique
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const campaign = mockCampaigns.find(c => c.id === id);

    if (!campaign) {
      return res.status(404).json({ error: 'Campagne non trouvée' });
    }

    res.json(campaign);
  } catch (error) {
    console.error('Erreur GET /api/subventions/:id:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

/**
 * GET /api/subventions/filter/active - Récupérer uniquement les campagnes actives
 */
router.get('/filter/active', async (req, res) => {
  try {
    const campaigns = mockCampaigns.filter(c => 
      c.status === 'ACTIVE' && new Date(c.deadline) > new Date()
    );

    res.json(campaigns);
  } catch (error) {
    console.error('Erreur GET /api/subventions/filter/active:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

/**
 * POST /api/subventions - Créer une nouvelle campagne (ADMIN only)
 */
router.post('/', async (req, res) => {
  try {
    const { 
      title, 
      organization, 
      description, 
      minAmount, 
      maxAmount, 
      deadline, 
      status,
      category,
      requiredDocuments,
      criteria,
      contactEmail,
      contactPhone,
      websiteUrl,
      notes,
      createdBy
    } = req.body;

    // Validation
    if (!title || !organization || !deadline) {
      return res.status(400).json({ 
        error: 'Champs requis manquants: title, organization, deadline' 
      });
    }

    const campaign = {
      id: `campaign_${Date.now()}`,
      title,
      organization,
      description: description || null,
      minAmount: minAmount ? parseFloat(minAmount) : null,
      maxAmount: maxAmount ? parseFloat(maxAmount) : null,
      deadline: new Date(deadline),
      status: status || 'ACTIVE',
      category: category || null,
      contactEmail: contactEmail || null,
      contactPhone: contactPhone || null,
      websiteUrl: websiteUrl || null,
      notes: notes || null,
      createdBy: createdBy || null,
      createdAt: new Date(),
      updatedAt: new Date(),
      SubventionExpense: []
    };

    mockCampaigns.push(campaign);
    res.status(201).json(campaign);
  } catch (error) {
    console.error('Erreur POST /api/subventions:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

/**
 * PUT /api/subventions/:id - Mettre à jour une campagne (ADMIN only)
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const index = mockCampaigns.findIndex(c => c.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Campagne non trouvée' });
    }

    const campaign = {
      ...mockCampaigns[index],
      ...updateData,
      updatedAt: new Date()
    };

    mockCampaigns[index] = campaign;
    res.json(campaign);
  } catch (error) {
    console.error('Erreur PUT /api/subventions/:id:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

/**
 * DELETE /api/subventions/:id - Supprimer une campagne (ADMIN only)
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const index = mockCampaigns.findIndex(c => c.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Campagne non trouvée' });
    }

    mockCampaigns.splice(index, 1);
    res.json({ message: 'Campagne supprimée avec succès' });
  } catch (error) {
    console.error('Erreur DELETE /api/subventions/:id:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

// ============================================
// EXPENSES ROUTES
// ============================================

const mockExpenses = {};

/**
 * GET /api/subventions/:campaignId/expenses - Lister les dépenses d'une campagne
 */
router.get('/:campaignId/expenses', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { status } = req.query;
    
    let expenses = mockExpenses[campaignId] || [];
    if (status) {
      expenses = expenses.filter(e => e.status === status);
    }

    res.json(expenses);
  } catch (error) {
    console.error('Erreur GET /api/subventions/:campaignId/expenses:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

/**
 * GET /api/subventions/:campaignId/expenses/:expenseId - Récupérer une dépense
 */
router.get('/:campaignId/expenses/:expenseId', async (req, res) => {
  try {
    const { campaignId, expenseId } = req.params;
    
    const expenses = mockExpenses[campaignId] || [];
    const expense = expenses.find(e => e.id === expenseId);

    if (!expense) {
      return res.status(404).json({ error: 'Dépense non trouvée' });
    }

    res.json(expense);
  } catch (error) {
    console.error('Erreur GET /api/subventions/:campaignId/expenses/:expenseId:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

/**
 * GET /api/subventions/:campaignId/expenses-summary - Résumé des dépenses
 */
router.get('/:campaignId/expenses-summary', async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    const expenses = mockExpenses[campaignId] || [];

    const summary = {
      total: expenses.reduce((sum, e) => sum + e.amount, 0),
      count: expenses.length,
      byStatus: {
        SUBMITTED: expenses.filter(e => e.status === 'SUBMITTED').length,
        APPROVED: expenses.filter(e => e.status === 'APPROVED').length,
        REJECTED: expenses.filter(e => e.status === 'REJECTED').length
      },
      byCategory: {}
    };

    expenses.forEach(e => {
      if (!summary.byCategory[e.category]) {
        summary.byCategory[e.category] = { count: 0, amount: 0 };
      }
      summary.byCategory[e.category].count += 1;
      summary.byCategory[e.category].amount += e.amount;
    });

    res.json(summary);
  } catch (error) {
    console.error('Erreur GET /api/subventions/:campaignId/expenses-summary:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

/**
 * POST /api/subventions/:campaignId/expenses - Créer une dépense
 */
router.post('/:campaignId/expenses', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const {
      description,
      amount,
      category,
      date,
      receipt,
      receiptFileName,
      receiptFileSize,
      receiptMimeType,
      notes,
      createdBy
    } = req.body;

    if (!description || amount === undefined) {
      return res.status(400).json({
        error: 'Champs requis manquants: description, amount'
      });
    }

    if (!mockExpenses[campaignId]) {
      mockExpenses[campaignId] = [];
    }

    const expense = {
      id: `expense_${Date.now()}`,
      campaignId,
      description,
      amount: parseFloat(amount),
      category: category || 'OTHER',
      date: date ? new Date(date) : new Date(),
      receipt: receipt || null,
      receiptFileName: receiptFileName || null,
      receiptFileSize: receiptFileSize || null,
      receiptMimeType: receiptMimeType || null,
      notes: notes || null,
      status: 'SUBMITTED',
      approvedBy: null,
      approvedAt: null,
      createdBy: createdBy || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    mockExpenses[campaignId].push(expense);
    res.status(201).json(expense);
  } catch (error) {
    console.error('Erreur POST /api/subventions/:campaignId/expenses:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

/**
 * PUT /api/subventions/:campaignId/expenses/:expenseId - Mettre à jour une dépense
 */
router.put('/:campaignId/expenses/:expenseId', async (req, res) => {
  try {
    const { campaignId, expenseId } = req.params;
    const updateData = req.body;

    if (!mockExpenses[campaignId]) {
      return res.status(404).json({ error: 'Dépense non trouvée' });
    }

    const index = mockExpenses[campaignId].findIndex(e => e.id === expenseId);
    if (index === -1) {
      return res.status(404).json({ error: 'Dépense non trouvée' });
    }

    const expense = {
      ...mockExpenses[campaignId][index],
      ...updateData,
      updatedAt: new Date(),
      ...(updateData.status === 'APPROVED' && { approvedAt: new Date() })
    };

    mockExpenses[campaignId][index] = expense;
    res.json(expense);
  } catch (error) {
    console.error('Erreur PUT /api/subventions/:campaignId/expenses/:expenseId:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

/**
 * DELETE /api/subventions/:campaignId/expenses/:expenseId - Supprimer une dépense
 */
router.delete('/:campaignId/expenses/:expenseId', async (req, res) => {
  try {
    const { campaignId, expenseId } = req.params;

    if (!mockExpenses[campaignId]) {
      return res.status(404).json({ error: 'Dépense non trouvée' });
    }

    const index = mockExpenses[campaignId].findIndex(e => e.id === expenseId);
    if (index === -1) {
      return res.status(404).json({ error: 'Dépense non trouvée' });
    }

    mockExpenses[campaignId].splice(index, 1);
    res.json({ message: 'Dépense supprimée avec succès' });
  } catch (error) {
    console.error('Erreur DELETE /api/subventions/:campaignId/expenses/:expenseId:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

export default router;

/**
 * GET /api/subventions - Lister toutes les campagnes de subvention
 */
router.get('/', async (req, res) => {
  try {
    const { status, organization } = req.query;
    
    const where = {};
    if (status) where.status = status;
    if (organization) where.organization = { contains: organization, mode: 'insensitive' };

    const campaigns = await prisma.subventionCampaign.findMany({
      where,
      orderBy: { deadline: 'asc' }
    });

    res.json(campaigns);
  } catch (error) {
    console.error('Erreur GET /api/subventions:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

/**
 * GET /api/subventions/:id - Récupérer une campagne spécifique
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const campaign = await prisma.subventionCampaign.findUnique({
      where: { id }
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campagne non trouvée' });
    }

    // Parser les champs JSON
    const parsed = {
      ...campaign,
      requiredDocuments: campaign.requiredDocuments ? JSON.parse(campaign.requiredDocuments) : [],
      criteria: campaign.criteria ? JSON.parse(campaign.criteria) : []
    };

    res.json(parsed);
  } catch (error) {
    console.error('Erreur GET /api/subventions/:id:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

/**
 * GET /api/subventions/active - Récupérer uniquement les campagnes actives
 */
router.get('/filter/active', async (req, res) => {
  try {
    const campaigns = await prisma.subventionCampaign.findMany({
      where: {
        status: 'ACTIVE',
        deadline: {
          gte: new Date()
        }
      },
      orderBy: { deadline: 'asc' }
    });

    res.json(campaigns);
  } catch (error) {
    console.error('Erreur GET /api/subventions/filter/active:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

/**
 * POST /api/subventions - Créer une nouvelle campagne (ADMIN only)
 */
router.post('/', async (req, res) => {
  try {
    const { 
      title, 
      organization, 
      description, 
      minAmount, 
      maxAmount, 
      deadline, 
      status,
      category,
      requiredDocuments,
      criteria,
      contactEmail,
      contactPhone,
      websiteUrl,
      notes,
      createdBy
    } = req.body;

    // Validation
    if (!title || !organization || !deadline) {
      return res.status(400).json({ 
        error: 'Champs requis manquants: title, organization, deadline' 
      });
    }

    const campaign = await prisma.subventionCampaign.create({
      data: {
        title,
        organization,
        description: description || null,
        minAmount: minAmount ? parseFloat(minAmount) : null,
        maxAmount: maxAmount ? parseFloat(maxAmount) : null,
        deadline: new Date(deadline),
        status: status || 'ACTIVE',
        category: category || null,
        requiredDocuments: requiredDocuments ? JSON.stringify(requiredDocuments) : null,
        criteria: criteria ? JSON.stringify(criteria) : null,
        contactEmail: contactEmail || null,
        contactPhone: contactPhone || null,
        websiteUrl: websiteUrl || null,
        notes: notes || null,
        createdBy: createdBy || null
      }
    });

    res.status(201).json(campaign);
  } catch (error) {
    console.error('Erreur POST /api/subventions:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

/**
 * PUT /api/subventions/:id - Mettre à jour une campagne (ADMIN only)
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      organization,
      description,
      minAmount,
      maxAmount,
      deadline,
      status,
      category,
      requiredDocuments,
      criteria,
      contactEmail,
      contactPhone,
      websiteUrl,
      notes
    } = req.body;

    const campaign = await prisma.subventionCampaign.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(organization && { organization }),
        ...(description !== undefined && { description }),
        ...(minAmount !== undefined && { minAmount: minAmount ? parseFloat(minAmount) : null }),
        ...(maxAmount !== undefined && { maxAmount: maxAmount ? parseFloat(maxAmount) : null }),
        ...(deadline && { deadline: new Date(deadline) }),
        ...(status && { status }),
        ...(category !== undefined && { category }),
        ...(requiredDocuments !== undefined && { requiredDocuments: requiredDocuments ? JSON.stringify(requiredDocuments) : null }),
        ...(criteria !== undefined && { criteria: criteria ? JSON.stringify(criteria) : null }),
        ...(contactEmail !== undefined && { contactEmail }),
        ...(contactPhone !== undefined && { contactPhone }),
        ...(websiteUrl !== undefined && { websiteUrl }),
        ...(notes !== undefined && { notes })
      }
    });

    res.json(campaign);
  } catch (error) {
    console.error('Erreur PUT /api/subventions/:id:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Campagne non trouvée' });
    }
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

/**
 * DELETE /api/subventions/:id - Supprimer une campagne (ADMIN only)
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.subventionCampaign.delete({
      where: { id }
    });

    res.json({ message: 'Campagne supprimée avec succès' });
  } catch (error) {
    console.error('Erreur DELETE /api/subventions/:id:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Campagne non trouvée' });
    }
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

export default router;
