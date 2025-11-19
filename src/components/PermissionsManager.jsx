import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Container,
  Grid,
  Tab,
  Tabs,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Checkbox,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  CircularProgress,
  Typography,
  Dialog as MuiDialog
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';

/**
 * Tab panel component
 */
function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

/**
 * PermissionsManager - Gestionnaire complet des permissions
 * Remplace les onglets "Accès MyRBE" et "Gestion des utilisateurs"
 */
export default function PermissionsManager() {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // State pour les permissions
  const [permissions, setPermissions] = useState({
    functions: [],
    roles: [],
    roleFunctionDefaults: {}
  });

  // State pour la gestion des utilisateurs
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userPermissions, setUserPermissions] = useState({});

  // State pour les filtres
  const [searchFilter, setSearchFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Dialog pour accorder une permission
  const [grantDialog, setGrantDialog] = useState(false);
  const [grantData, setGrantData] = useState({
    userId: '',
    functionId: '',
    access: false,
    read: false,
    write: false,
    expiresAt: null
  });

  // Récupérer les définitions des permissions
  useEffect(() => {
    fetchPermissionDefinitions();
  }, []);

  const fetchPermissionDefinitions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token');

      const response = await fetch('/api/permissions/definitions', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      setPermissions({
        functions: data.functions || [],
        roles: data.roles || [],
        roleFunctionDefaults: data.roleFunctionDefaults || {}
      });
      setError(null);
    } catch (err) {
      console.error('Error fetching permission definitions:', err);
      setError(`Erreur lors du chargement des permissions: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPermissions = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token');

      const response = await fetch(`/api/permissions/user/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      setUserPermissions(data.permissions || {});
    } catch (err) {
      console.error('Error fetching user permissions:', err);
      setError(`Erreur lors du chargement des permissions utilisateur: ${err.message}`);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token');

      const response = await fetch('/api/users/list', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const handleGrantPermission = async () => {
    try {
      if (!grantData.userId || !grantData.functionId) {
        setError('Veuillez sélectionner un utilisateur et une fonction');
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token');

      const response = await fetch('/api/permissions/grant', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: grantData.userId,
          functionId: grantData.functionId,
          access: grantData.access,
          read: grantData.read,
          write: grantData.write,
          expiresAt: grantData.expiresAt
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      setSuccess('Permission accordée avec succès');
      setGrantDialog(false);
      setGrantData({
        userId: '',
        functionId: '',
        access: false,
        read: false,
        write: false,
        expiresAt: null
      });
      if (selectedUser) {
        fetchUserPermissions(selectedUser.id);
      }
    } catch (err) {
      console.error('Error granting permission:', err);
      setError(`Erreur lors de l'octroi de la permission: ${err.message}`);
    }
  };

  const handleRevokePermission = async (permissionId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token');

      const response = await fetch(`/api/permissions/${permissionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      setSuccess('Permission révoquée avec succès');
      if (selectedUser) {
        fetchUserPermissions(selectedUser.id);
      }
    } catch (err) {
      console.error('Error revoking permission:', err);
      setError(`Erreur lors de la révocation: ${err.message}`);
    }
  };

  // Filtrer les fonctions
  const filteredFunctions = permissions.functions.filter(func => {
    if (searchFilter && !func.name.toLowerCase().includes(searchFilter.toLowerCase())) {
      return false;
    }
    if (roleFilter && !func.group?.toLowerCase().includes(roleFilter.toLowerCase())) {
      return false;
    }
    return true;
  });

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Titre */}
      <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 'bold' }}>
        🔐 Gestionnaire des Permissions du Site
      </Typography>

      {/* Messages */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          aria-label="permission management tabs"
        >
          <Tab label="Vue d'ensemble des permissions" id="tab-0" aria-controls="tabpanel-0" />
          <Tab label="Gestion des utilisateurs" id="tab-1" aria-controls="tabpanel-1" />
          <Tab label="Audit et logs" id="tab-2" aria-controls="tabpanel-2" />
        </Tabs>
      </Box>

      {/* TAB 1: Vue d'ensemble des permissions */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              placeholder="Rechercher une fonction..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              variant="outlined"
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Select
              fullWidth
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              displayEmpty
              size="small"
            >
              <MenuItem value="">Tous les groupes</MenuItem>
              {[...new Set(permissions.functions.map(f => f.group))].map(group => (
                <MenuItem key={group} value={group}>
                  {group}
                </MenuItem>
              ))}
            </Select>
          </Grid>
        </Grid>

        {/* Tableau des permissions */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>Fonction</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Groupe</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Description</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Rôles par défaut</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredFunctions.map((func) => (
                <TableRow key={func.id}>
                  <TableCell sx={{ fontWeight: '500' }}>{func.name}</TableCell>
                  <TableCell>{func.group}</TableCell>
                  <TableCell>{func.description}</TableCell>
                  <TableCell>
                    {permissions.roleFunctionDefaults[func.id]?.roles?.map(role => (
                      <Chip key={role} label={role} size="small" sx={{ mr: 1 }} />
                    ))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* TAB 2: Gestion des utilisateurs */}
      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardHeader title="Utilisateurs" />
              <CardContent>
                <TextField
                  fullWidth
                  placeholder="Rechercher un utilisateur..."
                  size="small"
                  sx={{ mb: 2 }}
                />
                <Typography variant="body2" color="textSecondary">
                  Chargement des utilisateurs...
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={8}>
            <Card>
              <CardHeader 
                title="Permissions" 
                action={
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={() => setGrantDialog(true)}
                  >
                    Ajouter une permission
                  </Button>
                }
              />
              <CardContent>
                {selectedUser ? (
                  <TableContainer component={Paper}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                          <TableCell sx={{ fontWeight: 'bold' }}>Fonction</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Accès</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Lecture</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Écriture</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Expiration</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {Object.entries(userPermissions).map(([funcId, perms]) => (
                          <TableRow key={funcId}>
                            <TableCell>{funcId}</TableCell>
                            <TableCell align="center">
                              {perms.access && <Chip label="✓" size="small" color="success" />}
                            </TableCell>
                            <TableCell align="center">
                              {perms.read && <Chip label="✓" size="small" color="success" />}
                            </TableCell>
                            <TableCell align="center">
                              {perms.write && <Chip label="✓" size="small" color="success" />}
                            </TableCell>
                            <TableCell>{perms.expiresAt || 'Jamais'}</TableCell>
                            <TableCell>
                              <Button
                                size="small"
                                color="error"
                                startIcon={<DeleteIcon />}
                                onClick={() => handleRevokePermission(perms.id)}
                              >
                                Révoquer
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography variant="body2" color="textSecondary">
                    Sélectionnez un utilisateur pour voir ses permissions
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* TAB 3: Audit et logs */}
      <TabPanel value={tabValue} index={2}>
        <Card>
          <CardHeader title="Audit des permissions" />
          <CardContent>
            <Typography variant="body2" color="textSecondary">
              Historique des modifications de permissions (en développement)
            </Typography>
          </CardContent>
        </Card>
      </TabPanel>

      {/* Dialog pour accorder une permission */}
      <MuiDialog open={grantDialog} onClose={() => setGrantDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Accorder une permission</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            fullWidth
            label="Utilisateur"
            select
            value={grantData.userId}
            onChange={(e) => setGrantData({ ...grantData, userId: e.target.value })}
            margin="normal"
          >
            {users.map(user => (
              <MenuItem key={user.id} value={user.id}>
                {user.name} ({user.email})
              </MenuItem>
            ))}
          </TextField>

          <TextField
            fullWidth
            label="Fonction"
            select
            value={grantData.functionId}
            onChange={(e) => setGrantData({ ...grantData, functionId: e.target.value })}
            margin="normal"
          >
            {permissions.functions.map(func => (
              <MenuItem key={func.id} value={func.id}>
                {func.name} ({func.group})
              </MenuItem>
            ))}
          </TextField>

          <Box sx={{ mt: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={grantData.access}
                  onChange={(e) => setGrantData({ ...grantData, access: e.target.checked })}
                />
              }
              label="Accès"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={grantData.read}
                  onChange={(e) => setGrantData({ ...grantData, read: e.target.checked })}
                />
              }
              label="Lecture"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={grantData.write}
                  onChange={(e) => setGrantData({ ...grantData, write: e.target.checked })}
                />
              }
              label="Écriture"
            />
          </Box>

          <TextField
            fullWidth
            label="Expiration (optionnel)"
            type="datetime-local"
            value={grantData.expiresAt || ''}
            onChange={(e) => setGrantData({ ...grantData, expiresAt: e.target.value })}
            margin="normal"
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGrantDialog(false)}>Annuler</Button>
          <Button onClick={handleGrantPermission} variant="contained" color="primary">
            Accorder
          </Button>
        </DialogActions>
      </MuiDialog>
    </Container>
  );
}
