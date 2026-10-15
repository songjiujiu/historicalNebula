import jenkins.model.Jenkins
import hudson.security.FullControlOnceLoggedInAuthorizationStrategy
import hudson.security.HudsonPrivateSecurityRealm
import hudson.security.csrf.DefaultCrumbIssuer

def jenkins = Jenkins.get()
if (jenkins.securityRealm instanceof HudsonPrivateSecurityRealm &&
    jenkins.authorizationStrategy instanceof FullControlOnceLoggedInAuthorizationStrategy) {
    return
}

def passwordFile = new File('/etc/jenkins-admin.secret')
def password = passwordFile.text.trim()
if (!password) {
    throw new IllegalStateException('Jenkins administrator secret is empty')
}

def realm = new HudsonPrivateSecurityRealm(false)
realm.createAccount('admin', password)
jenkins.setSecurityRealm(realm)

def authorization = new FullControlOnceLoggedInAuthorizationStrategy()
authorization.setAllowAnonymousRead(false)
jenkins.setAuthorizationStrategy(authorization)
jenkins.setCrumbIssuer(new DefaultCrumbIssuer(true))
jenkins.save()
