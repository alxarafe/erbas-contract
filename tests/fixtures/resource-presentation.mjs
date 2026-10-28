// Assets-inspired conceptual data only; no business-module implementation.
export function form(fields, actions = []) {
  return { behavior: { unsavedChanges: 'CONFIRM_DISCARD' }, actions,
    tabs: [{ id: 'general', label: 'General', actions: [], sections: [
      { id: 'identity', label: 'Identification', collapsible: false, initiallyCollapsed: false, actions: [],
        groups: [{ id: 'identity', label: 'Identity', fields }] }
    ] }] };
}
export function contextPresentation(metadata) {
  const fields = metadata.fields.map(field => field.name);
  const createFields = metadata.fields.filter(field => field.required && !field.readOnly).map(field => field.name);
  return { id: metadata.id, definitionHash: metadata.definitionHash, presentation: {
    list: { columns: [{ field: 'name', label: 'Asset name' }], actions: [] },
    create: form(createFields), edit: form(fields), view: form([...fields].reverse())
  } };
}
export function conceptualAsset() {
  const field = (name, extra = {}) => ({ name, type: 'STRING', required: false, nullable: false,
    readOnly: false, immutable: false, constraints: {}, enumValues: [], annotations: [],
    capabilities: { filterable: false, sortable: false, searchable: false, filterOperators: [] }, ...extra });
  return { id: 'example.asset', version: '1.0.0', moduleId: 'example.inventory',
    definitionHash: 'definition-with-contexts', idDefinition: { field: 'id' }, moduleEnabled: true,
    operations: Object.fromEntries(['list', 'get', 'create', 'update', 'delete'].map(name => [name, { declared: true, authorized: true }])),
    annotations: [], fields: [
    field('id', { type: 'UUID', readOnly: true, immutable: true }),
    field('assetTypeId', { type: 'UUID', required: true, immutable: true }),
    field('name', { required: true, annotations: [{ vocabulary: 'Common', term: 'Label', value: 'Name' }] }),
    field('notes', { nullable: true, default: null, constraints: { maximumLength: 256 } })
  ], relations: [{ name: 'type', kind: 'MANY_TO_ONE', localField: 'assetTypeId',
    targetResource: 'example.asset-type', targetField: 'id', displayField: 'name', required: true }],
  actions: [
    { name: 'retire', scope: 'ENTITY', requiresSelection: false, authorized: true, annotations: [], parameters: [] },
    { name: 'import', scope: 'COLLECTION', requiresSelection: false, authorized: true, annotations: [], parameters: [] },
    { name: 'export', scope: 'SELECTION', requiresSelection: true, authorized: true, annotations: [], parameters: [] }
  ], presentation: { form: form(['notes', 'name', 'assetTypeId', 'id'], ['retire']) } };
}
