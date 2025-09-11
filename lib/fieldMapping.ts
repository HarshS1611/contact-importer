// lib/fieldMapping.ts - Enhanced Combined Version with Fuse.js + Advanced Pattern Matching
import Fuse from 'fuse.js'
import { ContactField, DetectedField, User } from './types'
import { IFuseOptions } from 'fuse.js';

interface FieldSearchItem {
  field: ContactField
  searchText: string
  keywords: string[]
}

export class FieldMappingEngine {
  private contactFields: ContactField[]
  private fieldSearchEngine!: Fuse<FieldSearchItem>
  private fieldPatterns!: Record<string, RegExp>

  constructor(contactFields: ContactField[]) {
    this.contactFields = contactFields
    this.initializeSearchEngine()
    this.initializeFieldPatterns()
  }

  private initializeSearchEngine() {
    // Create enhanced searchable items with keywords and synonyms
    const searchItems: FieldSearchItem[] = this.contactFields.map(field => ({
      field,
      searchText: this.buildSearchText(field),
      keywords: this.getFieldKeywords(field.id)
    }))

    // Optimized Fuse.js configuration for field matching
    const fuseOptions: IFuseOptions<FieldSearchItem> = {
      keys: [
        { name: 'field.label', weight: 0.4 },
        { name: 'field.id', weight: 0.3 },
        { name: 'searchText', weight: 0.2 },
        { name: 'keywords', weight: 0.1 }
      ],
      threshold: 0.4,
      distance: 50,
      minMatchCharLength: 2,
      includeScore: true,
      includeMatches: true,
      ignoreLocation: true,
      useExtendedSearch: true
    }

    this.fieldSearchEngine = new Fuse(searchItems, fuseOptions)
  }

  private initializeFieldPatterns() {
    this.fieldPatterns = {
      email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      phone: /^[\+]?[\d\s\-\(\)\.]{10,20}$/,
      number: /^-?\d*\.?\d+$/,
      datetime: /^\d{4}-\d{2}-\d{2}|^\d{1,2}\/\d{1,2}\/\d{2,4}|^\d{1,2}-\d{1,2}-\d{2,4}/,
      url: /^https?:\/\/[^\s]+$/,
      zipcode: /^\d{5}(-\d{4})?$/,
      boolean: /^(true|false|yes|no|y|n|1|0|on|off)$/i
    }
  }

  private buildSearchText(field: ContactField): string {
    const parts = [
      field.label,
      field.id,
      ...this.getFieldKeywords(field.id)
    ]
    return parts.join(' ').toLowerCase()
  }

  private getFieldKeywords(fieldId: string): string[] {
    const keywordMap: Record<string, string[]> = {
      'firstName': ['first', 'fname', 'firstname', 'given', 'forename', 'christian'],
      'lastName': ['last', 'lname', 'lastname', 'surname', 'family', 'sur'],
      'fullName': ['name', 'full', 'fullname', 'complete', 'display'],
      'email': ['email', 'mail', 'e-mail', 'emailaddress', 'email_address', 'electronic'],
      'phone': ['phone', 'tel', 'telephone', 'mobile', 'cell', 'contact', 'number', 'cellular'],
      'workPhone': ['work', 'office', 'business', 'company'],
      'homePhone': ['home', 'personal', 'residential'],
      'address': ['address', 'street', 'location', 'addr'],
      'city': ['city', 'town', 'municipality', 'locality'],
      'state': ['state', 'province', 'region', 'territory'],
      'zipCode': ['zip', 'postal', 'postcode', 'zipcode', 'code'],
      'country': ['country', 'nation', 'nationality'],
      'company': ['company', 'organization', 'business', 'employer', 'firm'],
      'title': ['title', 'position', 'job', 'role', 'designation'],
      'agentUid': ['agent', 'assigned', 'owner', 'rep', 'representative', 'sales', 'manager'],
      'createdOn': ['created', 'createdon', 'date', 'added', 'timestamp', 'time', 'imported'],
      'updatedOn': ['updated', 'modified', 'changed', 'edited', 'last'],
      'notes': ['notes', 'comments', 'remarks', 'description', 'memo'],
      'tags': ['tags', 'categories', 'labels', 'keywords'],
      'status': ['status', 'state', 'condition', 'stage'],
      'source': ['source', 'origin', 'channel', 'referral', 'lead']
    }
    return keywordMap[fieldId] || []
  }

  // Main detection method combining Fuse.js with enhanced pattern analysis
  detectFields(headers: string[], sampleRows: string[][]): DetectedField[] {
    console.log('Starting enhanced field detection for headers:', headers)
    const detectedFields: DetectedField[] = []

    headers.forEach((header, index) => {
      const cleanHeader = this.normalizeHeader(header)
      console.log(`Analyzing header: "${header}" -> "${cleanHeader}" (index: ${index})`)

      // Get sample data for this column
      const sampleData = sampleRows
        .slice(0, 5)
        .map(row => row[index] || '')
        .filter(value => value && value.trim())

      console.log(`Sample data for "${header}":`, sampleData)

      // Use combined Fuse.js + pattern analysis
      const bestMatch = this.findBestFieldMatchCombined(cleanHeader, sampleData)
      console.log(`Best match for "${header}":`, bestMatch)

      detectedFields.push({
        name: header,
        suggestedMapping: bestMatch ? bestMatch.field.id : '',
        confidence: bestMatch ? bestMatch.confidence : 0,
        type: bestMatch && bestMatch.field.core ? 'core' : 'custom',
        samples: sampleData.slice(0, 3),
      })
    })

    console.log('Enhanced field detection completed. Detected fields:', detectedFields)
    return detectedFields
  }

  private normalizeHeader(header: string): string {
    return header
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  private findBestFieldMatchCombined(
    header: string,
    sampleData: string[]
  ): { field: ContactField; confidence: number; details: any } | null {

    // Step 1: Use Fuse.js for initial fuzzy matching
    const fuseResults = this.fieldSearchEngine.search(header)
    console.log(`Fuse.js results for "${header}":`, fuseResults.slice(0, 3))

    if (fuseResults.length === 0) {
      // Fallback to legacy pattern matching if Fuse.js finds nothing
      return this.fallbackPatternMatch(header, sampleData)
    }

    let bestMatch: { field: ContactField; confidence: number; details: any } | null = null

    // Step 2: Evaluate top Fuse.js results with enhanced scoring
    for (const result of fuseResults.slice(0, 3)) {
      const field = result.item.field
      
      // Convert Fuse.js score to confidence (0-60 points)
      const fuzzyScore = Math.round((1 - (result.score || 0)) * 60)
      
      // Enhanced data pattern analysis (0-40 points)
      const dataScore = this.calculateEnhancedDataScore(sampleData, field)
      
      // Keyword bonus for exact matches (0-30 points)
      const keywordBonus = this.calculateKeywordBonus(header, field.id)
      
      // Legacy similarity bonus for backwards compatibility (0-20 points)
      const legacyBonus = this.calculateLegacySimilarity(header, field)
      
      const totalConfidence = Math.min(fuzzyScore + dataScore + keywordBonus + legacyBonus, 100)
      
      console.log(`Field "${field.id}" analysis:`, {
        fuzzyScore,
        dataScore,
        keywordBonus,
        legacyBonus,
        totalConfidence
      })

      if (totalConfidence > 30 && (!bestMatch || totalConfidence > bestMatch.confidence)) {
        bestMatch = {
          field,
          confidence: totalConfidence,
          details: {
            fuzzyScore,
            dataScore,
            keywordBonus,
            legacyBonus,
            fuseMatches: result.matches
          }
        }
      }
    }

    return bestMatch
  }

  private fallbackPatternMatch(header: string, sampleData: string[]): { field: ContactField; confidence: number; details: any } | null {
    let bestMatch: { field: ContactField; confidence: number } | null = {
      field: null as any,
      confidence: 0
    }

    this.contactFields.forEach(field => {
      const legacyScore = this.calculateLegacySimilarity(header, field)
      const dataScore = this.calculateDataPatternScore(sampleData, field)
      const totalConfidence = legacyScore + dataScore

      if (totalConfidence > 30 && (!bestMatch || totalConfidence > bestMatch.confidence)) {
        bestMatch = { field, confidence: Math.min(totalConfidence, 100) }
      }
    })

    return bestMatch ? {
      ...bestMatch,
      details: { method: 'fallback_pattern', legacyScore: bestMatch.confidence }
    } : null
  }

  private calculateLegacySimilarity(header: string, field: ContactField): number {
    const headerWords = header.toLowerCase().split(/[\s_-]+/)
    const fieldWords = field.label.toLowerCase().split(/[\s_-]+/)
    const fieldId = field.id.toLowerCase()
    let score = 0

    // Exact match bonus
    if (header === field.label.toLowerCase() || header === fieldId) {
      score += 25
    }

    // Word matching
    headerWords.forEach(headerWord => {
      if (fieldWords.some(fieldWord => fieldWord.includes(headerWord) || headerWord.includes(fieldWord))) {
        score += 10
      }
      if (fieldId.includes(headerWord) || headerWord.includes(fieldId)) {
        score += 8
      }
    })

    return Math.min(score, 20) // Cap legacy bonus at 20 points
  }

  private calculateKeywordBonus(header: string, fieldId: string): number {
    const keywords = this.getFieldKeywords(fieldId)
    const headerWords = header.split(/[\s_-]+/)
    
    let bonus = 0
    for (const keyword of keywords) {
      if (headerWords.some(word => word.includes(keyword) || keyword.includes(word))) {
        bonus += 15
      }
    }
    
    return Math.min(bonus, 30)
  }

  private calculateEnhancedDataScore(sampleData: string[], field: ContactField): number {
    if (sampleData.length === 0) return 0

    let matches = 0
    let partialMatches = 0

    for (const value of sampleData) {
      const matchResult = this.analyzeValuePattern(value, field.type)
      if (matchResult.exact) {
        matches++
      } else if (matchResult.partial) {
        partialMatches++
      }
    }

    const exactPercentage = (matches / sampleData.length) * 100
    const partialPercentage = (partialMatches / sampleData.length) * 100
    
    const dataScore = (exactPercentage * 0.4) + (partialPercentage * 0.2)
    
    return Math.round(Math.min(dataScore, 40))
  }

  private calculateDataPatternScore(sampleData: string[], field: ContactField): number {
    if (sampleData.length === 0) return 0

    let matches = 0
    sampleData.forEach(value => {
      if (this.matchesFieldType(value, field.type)) {
        matches++
      }
    })

    const matchPercentage = (matches / sampleData.length) * 100
    return Math.round(matchPercentage * 0.4)
  }

  private analyzeValuePattern(value: string, fieldType: string): { exact: boolean; partial: boolean } {
    if (!value || !value.trim()) return { exact: false, partial: false }

    const trimmedValue = value.trim()

    switch (fieldType) {
      case 'email':
        return {
          exact: this.fieldPatterns.email.test(trimmedValue),
          partial: trimmedValue.includes('@')
        }
      case 'phone':
        return {
          exact: this.fieldPatterns.phone.test(trimmedValue) && /\d{3,}/.test(trimmedValue),
          partial: /\d{3,}/.test(trimmedValue)
        }
      case 'number':
        return {
          exact: this.fieldPatterns.number.test(trimmedValue),
          partial: /\d/.test(trimmedValue)
        }
      case 'datetime':
        const isValidDate = !isNaN(Date.parse(trimmedValue))
        return {
          exact: isValidDate && this.fieldPatterns.datetime.test(trimmedValue),
          partial: isValidDate || /\d{4}/.test(trimmedValue)
        }
      case 'checkbox':
        return {
          exact: this.fieldPatterns.boolean.test(trimmedValue),
          partial: false
        }
      case 'text':
      default:
        return {
          exact: trimmedValue.length > 0 && trimmedValue.length < 200,
          partial: trimmedValue.length > 0
        }
    }
  }

  private matchesFieldType(value: string, fieldType: string): boolean {
    if (!value || !value.trim()) return false
    const trimmedValue = value.trim()

    switch (fieldType) {
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedValue)
      case 'phone':
        return /^[\+]?[\d\s\-\(\)]{7,20}$/.test(trimmedValue)
      case 'number':
        return !isNaN(Number(trimmedValue))
      case 'datetime':
        return !isNaN(Date.parse(trimmedValue))
      case 'checkbox':
        return ['true', 'false', '1', '0', 'yes', 'no', 'y', 'n'].includes(trimmedValue.toLowerCase())
      case 'text':
      default:
        return trimmedValue.length > 0
    }
  }

  // Process all rows for import with agent email to Firebase ID mapping
  processAllRowsForImport(
    headers: string[],
    rows: string[][],
    mappings: Record<string, any>,
    users: User[]
  ): Array<Record<string, any>> {
    console.log('Processing', rows.length, 'rows for import with mappings:', mappings)

    const emailToAgentUidMap: Record<string, string> = {}
    users.forEach(user => {
      emailToAgentUidMap[user.email.toLowerCase()] = user.id
    })

    const processedContacts: Array<Record<string, any>> = []

    rows.forEach((row) => {
      const contact: Record<string, any> = {}

      Object.entries(mappings).forEach(([sourceField, mapping]) => {
        const columnIndex = headers.indexOf(sourceField)
        if (columnIndex === -1) return

        const rawValue = row[columnIndex]
        const targetField = mapping.targetField
        let processedValue = this.processFieldValue(rawValue, mapping.targetFieldType)

        // Special handling for agentUid field
        if (targetField === 'agentUid' && processedValue) {
          const emailLower = processedValue.toLowerCase().trim()
          const agentUid = emailToAgentUidMap[emailLower]
          processedValue =  emailLower || 'unassigned'
        }

        if (processedValue !== null && processedValue !== undefined) {
          contact[targetField] = processedValue
        }
      })

      if (Object.keys(contact).length > 0) {
        processedContacts.push(contact)
      }
    })

    console.log(`Processed ${processedContacts.length} contacts from ${rows.length} rows`)
    return processedContacts
  }

  private processFieldValue(rawValue: string, fieldType: string): string | null {
    if (!rawValue || typeof rawValue !== 'string') return null
    const trimmed = rawValue.trim()
    if (!trimmed) return null

    switch (fieldType) {
      case 'email':
        return trimmed.toLowerCase()
      case 'phone':
        return trimmed.replace(/[^\d\+\-\(\)\s\.]/g, '').trim()
      case 'number':
        const num = parseFloat(trimmed)
        return isNaN(num) ? null : num.toString()
      case 'checkbox':
        const lower = trimmed.toLowerCase()
        if (['true', '1', 'yes', 'y', 'on'].includes(lower)) return 'true'
        if (['false', '0', 'no', 'n', 'off'].includes(lower)) return 'false'
        return null
      case 'datetime':
        const date = new Date(trimmed)
        return isNaN(date.getTime()) ? null : date.toISOString()
      case 'text':
      default:
        return trimmed
    }
  }

  // Enhanced search for manual field selection
  searchFields(query: string): ContactField[] {
    if (!query.trim()) return this.contactFields
    const results = this.fieldSearchEngine.search(query)
    return results.slice(0, 10).map(result => result.item.field)
  }

  // Debug method
  debugHeaderMatch(header: string): any {
    const cleanHeader = this.normalizeHeader(header)
    const fuseResults = this.fieldSearchEngine.search(cleanHeader)
    
    return {
      normalizedHeader: cleanHeader,
      fuseResults: fuseResults.slice(0, 3),
      directKeywordMatches: this.contactFields
        .map(field => ({
          fieldId: field.id,
          matchingKeywords: this.getFieldKeywords(field.id).filter(keyword => 
            cleanHeader.includes(keyword) || keyword.includes(cleanHeader)
          )
        }))
        .filter(item => item.matchingKeywords.length > 0)
    }
  }

  getAvailableFields(): ContactField[] {
    return this.contactFields
  }

  validateMappings(mappings: Record<string, any>): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    const targetFields = Object.values(mappings).map((mapping: any) => mapping.targetField)
    const duplicates = targetFields.filter((field, index) => targetFields.indexOf(field) !== index)
    
    if (duplicates.length > 0) {
      errors.push(`Duplicate mappings found for: ${duplicates.join(', ')}`)
    }

    return { valid: errors.length === 0, errors }
  }
}
