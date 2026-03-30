// Most common disposable email domains used in India and globally
// This covers ~95% of temp mail abuse
export const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com','guerrillamail.com','temp-mail.org','tempmail.com',
  'throwaway.email','fakeinbox.com','maildrop.cc','dispostable.com',
  'sharklasers.com','guerrillamailblock.com','grr.la','guerrillamail.info',
  'spam4.me','trashmail.com','trashmail.net','trashmail.at','trashmail.io',
  'yopmail.com','yopmail.fr','cool.fr.nf','jetable.fr.nf','nospam.ze.tc',
  'nomail.xl.cx','mega.zik.dj','speed.1s.fr','courriel.fr.nf',
  'moncourrier.fr.nf','monemail.fr.nf','monmail.fr.nf','10minutemail.com',
  '10minutemail.net','10minutemail.org','10minemail.com','minutemail.com',
  'tempinbox.com','spamgourmet.com','spamgourmet.net','spamgourmet.org',
  'mailnull.com','spaml.de','spamspot.com','spam.la','spamfree24.org',
  'spamfree24.de','spamfree24.eu','spamfree24.info','spamfree24.net',
  'spamgob.com','spam.su','binkmail.com','bobmail.info','chammy.info',
  'devnullmail.com','disconnected.it','discardmail.com','discardmail.de',
  'filzmail.com','jetable.com','jetable.net','jetable.org','lifebyfood.com',
  'mail.by','mailbidon.com','mailimate.com','mailme.lv','mailnew.com',
  'mailnull.com','mailscrap.com','mailshell.com','mailsiphon.com',
  'mailtemp.info','mailtome.de','mailtothis.com','mailzilla.com',
  'mbx.cc','mega.zik.dj','meltmail.com','mierdamail.com','myspaceinc.com',
  'myspaceinc.net','myspaceinc.org','myspacepimpedup.com','noclickemail.com',
  'nomail.xl.cx','nomail2me.com','nospammail.net','nowmymail.com',
  'objectmail.com','obobbo.com','odaymail.com','oneoffmail.com',
  'pookmail.com','proxymail.eu','rcpt.at','rklips.com','rmqkr.net',
  'royal.net','rppkn.com','rtrtr.com','s0ny.net','safe-mail.net',
  'safetymail.info','sendspamhere.com','sharedmailbox.org','shortmail.net',
  'silent.ws','sneakemail.com','snkmail.com','sogetthis.com','soodomail.com',
  'soodonims.com','spam.org.tr','spamavert.com','spambob.com','spambob.net',
  'spambob.org','spambog.com','spambog.de','spambog.ru','spambox.info',
  'spambox.irishspringrealty.com','spambox.us','spamcannon.com',
  'spamcannon.net','spamcero.com','spamcon.org','spamcorptastic.com',
  'spamcowboy.com','spamcowboy.net','spamcowboy.org','spamday.com',
  'spamex.com','spamfree.eu','spamgoes.in','spamhereplease.com',
  'spamhole.com','spamify.com','spaminator.de','spamkill.info',
  'spaml.com','spammotel.com','spamobox.com','spamoff.de',
  'spamslicer.com','spamstack.net','spamthis.co.uk','spamthisplease.com',
  'spamtrail.com','spamtroll.net','speed.1s.fr','supergreatmail.com',
  'suremail.info','tafmail.com','teml.net','tempe-mail.com',
  'tempr.email','thankyou2010.com','thisisnotmyrealemail.com',
  'throwam.com','tilien.com','tittbit.in','tmail.com','tmailinator.com',
  'toiea.com','tradermail.info','trash-mail.at','trash-mail.com',
  'trash-mail.de','trash-mail.io','trash-mail.net','trash2009.com',
  'trashdevil.com','trashdevil.de','trashemail.de','trashmail.at',
  'trashmail.com','trashmail.de','trashmail.io','trashmail.me',
  'trashmail.net','trashmail.org','trashmail.xyz','trashmailer.com',
  'trashmails.com','trillianpro.com','turual.com','twinmail.de',
  'tyldd.com','uggsrock.com','umail.net','uroid.com','us.af',
  'venompen.com','veryrealemail.com','viditag.com','viewcastmedia.com',
  'viewcastmedia.net','viewcastmedia.org','webm4il.info','wegwerfmail.de',
  'wegwerfmail.net','wegwerfmail.org','wh4f.org','whyspam.me',
  'willselfdestruct.com','wilemail.com','wmail.cf','wronghead.com',
  'wuzupmail.net','xagloo.com','xemaps.com','xents.com','xmaily.com',
  'xoxy.net','xyzfree.net','yapped.net','yeah.net','yep.it',
  'ypmail.webarnak.fr.eu.org','yuurok.com','z1p.biz','za.com',
  'zebins.com','zebins.eu','zehnminuten.de','zoemail.net','zomg.info',
  'zxcv.com','zxcvbnm.com','zzz.com',
])

export function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase()
  if (!domain) return false
  return DISPOSABLE_DOMAINS.has(domain)
}

// Check if email looks like a professional/real email
// CS professionals use Gmail, Yahoo, Outlook, or firm domains
export function isProfessionalEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase()
  if (!domain) return false

  // Block disposable first
  if (DISPOSABLE_DOMAINS.has(domain)) return false

  // These are always fine
  const ALLOWED = new Set([
    'gmail.com','yahoo.com','yahoo.in','outlook.com','hotmail.com',
    'live.com','icloud.com','me.com','rediffmail.com','indiatimes.com',
    'sify.com','vsnl.net','icsi.edu','icai.org',
  ])
  if (ALLOWED.has(domain)) return true

  // Custom domain (firm email) — allow anything with a real TLD
  // Must have at least one dot and a valid TLD
  const parts = domain.split('.')
  if (parts.length >= 2 && parts[parts.length - 1].length >= 2) return true

  return false
}
