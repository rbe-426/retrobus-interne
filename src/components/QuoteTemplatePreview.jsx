import React from 'react';
import { Box, Spinner, Alert, AlertIcon, Text } from '@chakra-ui/react';

/**
 * QuoteTemplatePreview Component
 * Renders a quote/invoice template with live placeholder replacement
 * 
 * Props:
 * - template: { id, name, htmlContent, logoSmall, logoBig, placeholders }
 * - data: { VAR_NAME: value, ... } for {{VAR_NAME}} replacement
 */
export default function QuoteTemplatePreview({ template, data }) {
  if (!template) {
    return (
      <Alert status="warning">
        <AlertIcon />
        <Text>Aucun template sélectionné</Text>
      </Alert>
    );
  }

  if (!template.htmlContent) {
    return (
      <Alert status="error">
        <AlertIcon />
        <Text>Contenu HTML du template vide</Text>
      </Alert>
    );
  }

  // Guard: ensure data is an object before processing
  if (!data || typeof data !== 'object') {
    console.warn('⚠️ QuoteTemplatePreview: data is invalid or missing', data);
    return (
      <Alert status="warning">
        <AlertIcon />
        <Text>Données de template manquantes</Text>
      </Alert>
    );
  }

  // Replace placeholders with actual data
  let html = template.htmlContent;
  
  try {
    // Replace {{PLACEHOLDER}} style variables (skip DEVIS_LINES_TR for now, it's HTML)
    Object.entries(data).forEach(([key, value]) => {
      // Skip raw HTML placeholders
      if (key === 'DEVIS_LINES_TR') return;
      
      const placeholder = `{{${key}}}`;
      const regex = new RegExp(placeholder, 'g');
      // Escape HTML for text values
      const escapedValue = String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
      html = html.replace(regex, escapedValue);
    });
    
    // Replace DEVIS_LINES_TR as raw HTML
    if (data.DEVIS_LINES_TR) {
      html = html.replace(/{{DEVIS_LINES_TR}}/g, data.DEVIS_LINES_TR);
    }
  } catch (err) {
    console.error('❌ Erreur remplacement placeholders:', err);
    return (
      <Alert status="error">
        <AlertIcon />
        <Text>Erreur lors du rendu du template: {err.message}</Text>
      </Alert>
    );
  }

  // Also replace logo placeholders if present (they are already base64)
  try {
    if (template.logoBig) {
      html = html.replace(/{{LOGO_BIG}}/g, `data:image/png;base64,${template.logoBig}`);
    }
    if (template.logoSmall) {
      html = html.replace(/{{LOGO_SMALL}}/g, `data:image/png;base64,${template.logoSmall}`);
    }
  } catch (err) {
    console.warn('⚠️ Erreur remplacement logos:', err);
  }

  return (
    <Box
      maxH="600px"
      overflowY="auto"
      borderWidth="1px"
      borderRadius="md"
      p={4}
      bg="white"
      className="template-preview"
    >
      <div
        dangerouslySetInnerHTML={{ __html: html }}
        style={{
          fontSize: '14px',
          lineHeight: '1.6',
          color: '#333'
        }}
      />
    </Box>
  );
}
