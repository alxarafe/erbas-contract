// Contract conformance oracle; no renderer, business rules or authorization.
const contexts = Object.freeze(['list', 'create', 'edit', 'view']);
const actionScopes = Object.freeze({ list: ['COLLECTION', 'SELECTION'], create: ['COLLECTION'], edit: ['ENTITY'], view: ['ENTITY'] });
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
function check(condition, message) { if (!condition) throw new Error(message); }
function shape(value, required, optional = []) {
  check(object(value), 'Expected presentation object');
  check(required.every(key => Object.hasOwn(value, key)), 'Missing presentation member');
  check(Object.keys(value).every(key => [...required, ...optional].includes(key)), 'Unknown presentation member');
}
function text(value) { check(typeof value === 'string' && value.length > 0, 'Expected nonempty presentation text'); }
function unique(values, description) { check(new Set(values).size === values.length, `Duplicate ${description}`); }
function array(value) { check(Array.isArray(value), 'Expected presentation array'); }
function fieldsOf(form) { return form.tabs.flatMap(tab => tab.sections.flatMap(section => section.groups.flatMap(group => group.fields))); }
function actionsOf(form) { return [...form.actions, ...form.tabs.flatMap(tab => [...tab.actions, ...tab.sections.flatMap(section => section.actions)])]; }
function validateForm(form) {
  shape(form, ['behavior', 'actions', 'tabs']);
  shape(form.behavior, ['unsavedChanges']);
  check(['CONFIRM_DISCARD', 'ALLOW_DISCARD'].includes(form.behavior.unsavedChanges), 'Unknown unsaved-change policy');
  array(form.actions); array(form.tabs);
  for (const tab of form.tabs) {
    shape(tab, ['id', 'actions', 'sections'], ['label']); text(tab.id); if (Object.hasOwn(tab, 'label')) text(tab.label);
    array(tab.actions); array(tab.sections); unique(tab.sections.map(section => section.id), 'section ID');
    for (const section of tab.sections) {
      shape(section, ['id', 'collapsible', 'initiallyCollapsed', 'actions', 'groups'], ['label']); text(section.id);
      if (Object.hasOwn(section, 'label')) text(section.label);
      check(typeof section.collapsible === 'boolean' && typeof section.initiallyCollapsed === 'boolean', 'Invalid collapse flags');
      array(section.actions); array(section.groups); unique(section.groups.map(group => group.id), 'group ID');
      for (const group of section.groups) {
        shape(group, ['id', 'fields'], ['label']); text(group.id); if (Object.hasOwn(group, 'label')) text(group.label);
        array(group.fields); group.fields.forEach(text);
      }
    }
  }
  unique(form.tabs.map(tab => tab.id), 'tab ID');
}
function validatePresentation(metadata, response) {
  shape(response, ['id', 'definitionHash', 'presentation']); text(response.id); text(response.definitionHash);
  check(response.id === metadata.id && response.definitionHash === metadata.definitionHash, 'Presentation metadata identity mismatch');
  shape(response.presentation, [], contexts);
  const fieldNames = new Set(metadata.fields.map(field => field.name));
  const actions = new Map(metadata.actions.map(action => [action.name, action]));
  for (const context of contexts) {
    if (!Object.hasOwn(response.presentation, context)) continue;
    const layout = response.presentation[context]; let fields, placements;
    if (context === 'list') {
      shape(layout, ['columns', 'actions']); array(layout.columns); array(layout.actions);
      for (const column of layout.columns) { shape(column, ['field'], ['label']); text(column.field); if (Object.hasOwn(column, 'label')) text(column.label); }
      fields = layout.columns.map(column => column.field); placements = layout.actions;
    } else {
      validateForm(layout); fields = fieldsOf(layout); placements = actionsOf(layout);
    }
    unique(fields, 'field reference'); unique(placements, 'action reference');
    for (const field of fields) check(fieldNames.has(field), 'Unknown presentation field reference');
    for (const name of placements) {
      text(name); check(actions.has(name), 'Unknown presentation action reference');
      check(actionScopes[context].includes(actions.get(name).scope), 'Action scope incompatible with presentation context');
    }
  }
}
const annotation = (field, vocabulary, term) => field.annotations.find(a => a.vocabulary === vocabulary && a.term === term)?.value;
function resolvePresentation(metadata, response, context) {
  check(contexts.includes(context), 'Unknown presentation context');
  if (response !== undefined) validatePresentation(metadata, response);
  const specific = response?.presentation[context];
  const form = context === 'list' ? undefined : specific ?? metadata.presentation?.form;
  const eligible = metadata.fields.filter(field => annotation(field, 'UI', 'Hidden') !== true &&
    (context === 'list' || annotation(field, 'UI', 'FormExcluded') !== true));
  const columns = context === 'list' && specific ? specific.columns :
    (form ? fieldsOf(form).map(field => ({ field })) : eligible.map(field => ({ field: field.name })));
  // Legacy rendering appends unplaced eligible fields; explicit contexts select a subset.
  if (!specific && form) for (const field of eligible) if (!columns.some(c => c.field === field.name)) columns.push({ field: field.name });
  const selected = []; const seen = new Set();
  for (const column of columns) {
    const field = eligible.find(field => field.name === column.field);
    if (!field || seen.has(field.name)) continue;
    const label = annotation(field, 'Common', 'Label');
    seen.add(field.name); selected.push({ field: field.name, label: column.label ?? (typeof label === 'string' && label.length ? label : field.name) });
  }
  const placements = context === 'list' ? specific?.actions ?? [] : form ? actionsOf(form) : [];
  const visibleActions = [...placements, ...metadata.actions.map(action => action.name)]
    .filter(name => metadata.actions.some(a => a.name === name && a.authorized && actionScopes[context].includes(a.scope)));
  return { source: specific ? 'context' : form ? 'form' : 'fields', fields: selected, actions: [...new Set(visibleActions)], ...(form ? { form } : {}) };
}
module.exports = { contexts, actionScopes, validatePresentation, resolvePresentation };
