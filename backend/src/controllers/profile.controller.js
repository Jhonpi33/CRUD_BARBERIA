import { Profile, PROFILE_TYPES, REQUIRED_FIELDS } from '../models/Profile.js'

/** Mapea rol de usuario -> tipo de perfil. Fuente de verdad del tipo. */
const ROLE_TO_TYPE = {
  barber: 'barber',
  barbershop_owner: 'barbershop',
}

/** Traduce el rol del usuario a un tipo de perfil, o null si no aplica. */
function typeForRole(role) {
  return ROLE_TO_TYPE[role] || null
}

/** Convierte un texto a slug amigable ("Carlos ElBarbero" -> "carlos-elbarbero"). */
function slugify(text) {
  return String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

/** Genera un slug único, añadiendo un sufijo si ya existe otro perfil. */
async function uniqueSlug(base) {
  const clean = slugify(base) || 'perfil'
  let candidate = clean
  let attempt = 0

  // eslint-disable-next-line no-await-in-loop
  while (await Profile.exists({ slug: candidate })) {
    attempt += 1
    candidate = `${clean}-${attempt}`
  }

  return candidate
}

/**
 * GET /api/profile/me
 * Devuelve el perfil del usuario autenticado. Si no existe y el rol admite
 * perfil, lo crea vacío para que el frontend pueda retomar el onboarding.
 */
export async function getMyProfile(req, res, next) {
  try {
    const type = typeForRole(req.user.role)

    // Roles sin perfil propio (admin, empleado): sin onboarding.
    if (!type) {
      return res.json({ profile: null })
    }

    let profile = await Profile.findOne({ owner: req.user._id })

    if (!profile) {
      profile = await Profile.create({ owner: req.user._id, type })
    }

    res.json({ profile })
  } catch (err) {
    next(err)
  }
}

/**
 * PUT /api/profile/me
 * Crea o actualiza el perfil del usuario autenticado.
 * El `type` sale del ROL del usuario, nunca del body.
 * Acepta guardado parcial: sirve para retomar un onboarding incompleto.
 */
export async function upsertMyProfile(req, res, next) {
  try {
    const type = typeForRole(req.user.role)

    if (!type) {
      return res.status(403).json({ message: 'Tu tipo de cuenta no tiene perfil editable' })
    }

    const b = req.body || {}

    // Campos permitidos según el tipo; lo demás se ignora.
    const allowed =
      type === 'barber'
        ? {
            phone: b.phone,
            location: b.location,
            professionalName: b.professionalName,
            photoUrl: b.photoUrl,
            description: b.description,
          }
        : {
            phone: b.phone,
            location: b.location,
            businessName: b.businessName,
            logoUrl: b.logoUrl,
            ...(b.settings ? { settings: b.settings } : {}),
          }

    // Elimina claves undefined para no pisar valores existentes con undefined.
    for (const key of Object.keys(allowed)) {
      if (allowed[key] === undefined) delete allowed[key]
    }

    const profile = await Profile.findOneAndUpdate(
      { owner: req.user._id },
      { $set: { ...allowed, type } },
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
    )

    res.json({ profile })
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /api/profile/me/complete
 * Valida que estén todos los campos obligatorios del tipo, genera el enlace
 * público (slug) y marca el onboarding como completado.
 */
export async function completeMyProfile(req, res, next) {
  try {
    const type = typeForRole(req.user.role)

    if (!type) {
      return res.status(403).json({ message: 'Tu tipo de cuenta no tiene perfil' })
    }

    const profile = await Profile.findOne({ owner: req.user._id })
    if (!profile) {
      return res.status(404).json({ message: 'Primero guarda los datos de tu perfil' })
    }

    // Comprueba campos obligatorios según el tipo.
    const required = REQUIRED_FIELDS[type]
    const missing = required.filter((field) => !String(profile[field] || '').trim())
    if (missing.length > 0) {
      return res.status(422).json({
        message: 'Faltan datos obligatorios para terminar el onboarding.',
        missing,
      })
    }

    // El enlace público solo aplica al barbero por ahora.
    if (type === 'barber' && !profile.slug) {
      profile.slug = await uniqueSlug(profile.professionalName)
    }

    profile.completedAt = new Date()
    await profile.save()

    res.json({ profile })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/profile/u/:slug — perfil público (solo perfiles completados).
 * Devuelve solo campos públicos; nunca el email ni datos internos.
 */
export async function getPublicProfile(req, res, next) {
  try {
    const profile = await Profile.findOne({
      slug: req.params.slug.toLowerCase(),
      completedAt: { $ne: null },
    }).populate('owner', 'name')

    if (!profile) {
      return res.status(404).json({ message: 'Este perfil no existe o aún no está publicado' })
    }

    res.json({
      profile: {
        type: profile.type,
        slug: profile.slug,
        professionalName: profile.professionalName,
        businessName: profile.businessName,
        photoUrl: profile.photoUrl,
        logoUrl: profile.logoUrl,
        description: profile.description,
        phone: profile.phone,
        location: profile.location,
        settings: profile.type === 'barbershop' ? profile.settings : undefined,
        ownerName: profile.owner?.name,
      },
    })
  } catch (err) {
    next(err)
  }
}

export { PROFILE_TYPES }
