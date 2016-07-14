import React, { PropTypes } from 'react';
import { connect } from 'react-redux';

import { Row, Col, Well, Alert } from 'react-bootstrap';

import Utils from '../../../utils';
import { Link } from 'react-router';

import { getBouncesForRequest } from '../../../selectors/tasks';

import CancelDeployButton from './CancelDeployButton';
import AdvanceDeployButton from './AdvanceDeployButton';

const RequestAlerts = ({requestId, requestAPI, bounces, activeTasksForRequest}) => {
  if (!requestAPI) {
    return undefined;
  }

  let maybeBouncing;

  const requestParent = requestAPI.data;
  if (bounces.length > 0) {
    const runningInstanceCount = Utils.request.runningInstanceCount(activeTasksForRequest.data);
    maybeBouncing = (
      <Alert bsStyle="warning">
        <b>Request is bouncing:</b> {runningInstanceCount} of {requestParent.request.instances} replacement tasks are currently running.
      </Alert>
    );
  }

  let maybeDeploying;
  const { pendingDeploy, activeDeploy } = requestParent;
  if (pendingDeploy) {
    const deployingInstanceCount = Utils.request.deployingInstanceCount(requestParent, activeTasksForRequest.data);
    const { instances } = requestParent.request;
    const pendingDeployProgress = (
      <span>{`${deployingInstanceCount} of ${instances} new tasks are currently running`}</span>
    );

    let maybeDeployProgress;
    let maybeAdvanceDeploy;

    const { pendingDeployState } = requestParent;
    if (pendingDeployState && pendingDeployState.deployProgress) {
      const { deployProgress, deployMarker } = pendingDeployState;
      const {
        targetActiveInstances,
        stepComplete,
        autoAdvanceDeploySteps
      } = deployProgress;

      const { deployId } = deployMarker;

      if (targetActiveInstances === instances) {
        // all instances have launched, but it's still pending... wait for them to become healthy
        maybeDeployProgress = (
          <span>
            {pendingDeployProgress}
            <p>{deployingInstanceCount === instances ? ' Waiting for new tasks to become healthy.' : ''}</p>
          </span>
        );
      } else {
        maybeAdvanceDeploy = (
          <AdvanceDeployButton requestId={requestId} deployId={deployId} />
        );
        // not all instances have launched, wait for that to happen
        if (stepComplete) {
          let nextDeployStepRemark;
          if (autoAdvanceDeploySteps) {
            const nextDeployStepTimestamp = deployProgress.timestamp + deployProgress.deployStepWaitTimeMs;
            nextDeployStepRemark = <span>next deploy step {Utils.timestampFromNow(nextDeployStepTimestamp)}</span>;
          } else {
            nextDeployStepRemark = <span>waiting for manual trigger of next deploy step.</span>;
          }
          maybeDeployProgress = (
            <span>
              Finished deploying {targetActiveInstances} of {instances} total instances, {nextDeployStepRemark}
            </span>
          );
        } else {
          maybeDeployProgress = (
            <span>
              {
                `Trying to deploy ${targetActiveInstances} of ${instances}
                instances, ${deployingInstanceCount} of
                ${targetActiveInstances} new tasks are currently running.`
              }
            </span>
          );
        }
      }
    }

    maybeDeploying = (
      <Well>
        <Row>
          <Col md={8}>
            <b>Deploy </b>
            <code>
              <Link to={`request/${requestId}/deploy/${pendingDeploy.id}`}>
                {pendingDeploy.id}
              </Link>
            </code>
            <b> is pending: </b>
            {maybeDeployProgress}
          </Col>
          <Col md={4}>
            <div style={{textAlign: 'right'}}>
              {maybeAdvanceDeploy}
              <CancelDeployButton deployId={pendingDeploy.id} requestId={requestId} />
            </div>
          </Col>
        </Row>
      </Well>
    );
  }

  let maybeActiveDeploy;
  if (activeDeploy) {
    const deployedBy = Utils.maybe(activeDeploy, ['metadata', 'deployedBy']);

    let maybeDeployedBy;
    if (typeof deployedBy === 'string') {
      maybeDeployedBy = (
        <span> {deployedBy.split('@')[0]}</span>
      );
    }

    let maybeTimestamp;
    if (activeDeploy.timestamp) {
      maybeTimestamp = (
        <span> {Utils.timestampFromNow(activeDeploy.timestamp)}</span>
      );
    }

    maybeActiveDeploy = (
      <div>
        <span>Active deploy </span>
        <code>
          <Link to={`request/${requestId}/deploy/${activeDeploy.id}`}>
            {activeDeploy.id}
          </Link>
        </code>
        {maybeDeployedBy}
        {maybeTimestamp}
      </div>
    );
  } else if (!Utils.api.isFirstLoad(requestAPI)) {
    maybeActiveDeploy = (
      <span className="text-danger">
        No active deploy
      </span>
    );
  }

  return (
    <div>
      {maybeBouncing}
      {maybeDeploying}
      <Well>
        <Row>
          <Col md={10} sm={8}>
            {maybeActiveDeploy}
          </Col>
          <Col md={2} sm={4}>
            <a href="#deploy-history" className="pull-right">
              Deploy history
            </a>
          </Col>
        </Row>
      </Well>
    </div>
  );
};

RequestAlerts.propTypes = {
  requestId: PropTypes.string.isRequired,
  requestAPI: PropTypes.object.isRequired,
  bounces: PropTypes.arrayOf(PropTypes.object).isRequired,
  activeTasksForRequest: PropTypes.object.isRequired
};

const mapStateToProps = (state, ownProps) => {
  return {
    requestAPI: Utils.maybe(state.api.request, [ownProps.requestId]),
    bounces: getBouncesForRequest(ownProps.requestId)(state),
    activeTasksForRequest: Utils.maybe(state.api, ['activeTasksForRequest', ownProps.requestId])
  };
};


export default connect(
  mapStateToProps
)(RequestAlerts);
